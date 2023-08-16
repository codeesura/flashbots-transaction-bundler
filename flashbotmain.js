// Import required modules
const { ethers } = require("ethers");
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require("@flashbots/ethers-provider-bundle");
require('dotenv').config();

// Define contract addresses
const addresses = {
  'Rarible-ERC1155': '0xd07dc4262BCDbf85190C01c996b4C06a461d2430',
  'Rarible-ERC721': '0x60F80121C31A0d46B5279700f9DF786054aa5eE5'
};

// Define chain ID
const CHAIN_ID = 1;

// Set up Ethereum provider
const provider = new ethers.providers.JsonRpcProvider(`https://ethereum.publicnode.com`);

// Load private keys from environment variables
const safeWalletkey = process.env.PRIVATE_KEY_SAFE_WALLET;
const hackWalletkey = process.env.PRIVATE_KEY_HACK_WALLET;

// Create wallet instances
const safeWallet = new ethers.Wallet(safeWalletkey, provider);
const hackWallet = new ethers.Wallet(hackWalletkey, provider);

// Load contract ABIs
const erc1155ABI = require('./ABI/erc1155ABI.json')
const erc721ABI = require('./ABI/erc721ABI.json')

// Create contract instances for ERC1155
const rarible1155Interface = new ethers.utils.Interface(erc1155ABI);
const contractERC1155 = new ethers.Contract(addresses["Rarible-ERC1155"], erc1155ABI, provider);

// Create contract instances for ERC721
const rarible721Interface = new ethers.utils.Interface(erc721ABI);
const contractERC721 = new ethers.Contract(addresses["Rarible-ERC721"], erc721ABI, provider);

// Round a number to the specified decimal places
function roundToNextDecimal(number, decimalPlaces) {
    const scaleFactor = Math.pow(10, decimalPlaces);
    return Math.round(number * scaleFactor) / scaleFactor;
}

// Estimate the gas limit for a transaction
async function estimateGasLimit(transaction, senderWallet) {
    try {
        const gasEstimate = await senderWallet.estimateGas(transaction);
        return gasEstimate;
    } catch (error) {
        console.error("Error estimating gas: ", error);
    }
}
  
// Process transactions and create a bundle
async function processTransactions() {
    // Initialize total gas limit for all transactions in the bundle
    let totalGasLimit = ethers.BigNumber.from("0");

    // Initialize the bundle array to store the transactions
    const bundle = [];
    // Define token IDs for ERC1155 and ERC721 transfers
    const erc1155Ids = [643798, 643770, 644039, 643780, 186568, 643787, 519226, 4];
    const erc721Ids = [1136913, 1136899]

    // Generate an array of owners for ERC1155 tokens (all being the hackWallet address)
    const owners = Array(erc1155Ids.length).fill(hackWallet.address); 
    
    // Fetch the current balances of the ERC1155 tokens
    const balances = await contractERC1155.balanceOfBatch(owners, erc1155Ids);
    
    // Construct the batch transfer transaction for ERC1155 tokens
    const batchTransferTransactionERC1155 = {
        chainId: CHAIN_ID,
        to: addresses["Rarible-ERC1155"],
        data: rarible1155Interface.encodeFunctionData("safeBatchTransferFrom", [
            hackWallet.address,
            safeWallet.address,
            erc1155Ids,
            balances,
            ethers.utils.formatBytes32String("")
        ]),
        type: 2
    };
    
    // Estimate and set the gas limit for the ERC1155 batch transfer transaction
    const gasLimitForBatchTransfer = await estimateGasLimit(batchTransferTransactionERC1155, hackWallet);
    batchTransferTransactionERC1155.gasLimit = parseInt(gasLimitForBatchTransfer);
    totalGasLimit = totalGasLimit.add(gasLimitForBatchTransfer);

    // Add the ERC1155 batch transfer transaction to the bundle
    bundle.push({
        transaction: batchTransferTransactionERC1155,
        signer: hackWallet,
    });

    console.log("Gas Limit for Batch Transfer:", gasLimitForBatchTransfer.toString());

    // Loop through each ERC721 token ID to create and add individual transfer transactions to the bundle
    for (let i = 0; i < erc721Ids.length; i++) {    
        const transferTransactionERC721 = {
            chainId: CHAIN_ID,
            to: addresses["Rarible-ERC721"],
            data: rarible721Interface.encodeFunctionData("transferFrom", [
                hackWallet.address,
                safeWallet.address,
                erc721Ids[i],
            ]),
            type: 2
        };
    
        // Estimate and set the gas limit for the ERC721 transfer transaction
        const gasLimitForTransaction2 = await estimateGasLimit(transferTransactionERC721, hackWallet);
        transferTransactionERC721.gasLimit = parseInt(gasLimitForTransaction2);
        totalGasLimit = totalGasLimit.add(gasLimitForTransaction2);
    
        // Add the ERC721 transfer transaction to the bundle
        bundle.push({
            transaction: transferTransactionERC721,
            signer: hackWallet,
        });

        
        console.log(`Transaction ${i + 1} ERC721 Gas Limit:`, gasLimitForTransaction2.toString());
    }

    // Log the total gas limit required for all transactions in the bundle
    console.log("Total Gas Limit for All Transactions:", totalGasLimit.toString());

    // Return the total gas limit and the bundle of transactions
    return { totalGasLimit, bundle };
}

// Perform a safe transfer using Flashbots
async function safeTransfer() {
    // Create a Flashbots provider using a random wallet for authentication
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, ethers.Wallet.createRandom());

    // Process the transactions and get the total gas limit and bundle
    const { totalGasLimit, bundle } = await processTransactions();

    // Listen for new blocks
    provider.on('block', async (blockNumber) => {
        try {
            // Fetch the current gas price from the network
            const gasPrice = await provider.getGasPrice();
            
            // Calculate the decimal representation of the gas price with an additional 1.5 Gwei
            const GAS_PRICE_INCREMENT = 1.5;
            const gasPriceDecimal = ((parseInt(gasPrice.toString()) / 1e9) + GAS_PRICE_INCREMENT).toFixed(8);     
            
            // Calculate the value to be sent with the transaction to cover the gas cost
            const valueCalculate = roundToNextDecimal((gasPriceDecimal * (parseInt(totalGasLimit))) / 1e9, 8);

            // Define the initial transaction to be added to the bundle
            bundle.unshift({
                transaction: {
                    chainId: CHAIN_ID,
                    to: hackWallet.address,
                    value: ethers.utils.parseEther(valueCalculate.toFixed(8).toString()),
                    type: 2,
                    gasLimit: 21000,
                },
                signer: safeWallet,
            });

            // Update the gas price for all transactions in the bundle
            for (const txBundle of bundle) {
                txBundle.transaction.maxFeePerGas = ethers.utils.parseUnits(gasPriceDecimal, 'gwei');
                txBundle.transaction.maxPriorityFeePerGas = ethers.utils.parseUnits(gasPriceDecimal, 'gwei');
            }

            // Send the bundle using Flashbots
            const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(bundle, blockNumber + 1);
            const resolution = await flashbotsTransactionResponse.wait();

            // Check the resolution of the Flashbots bundle
            if (resolution === FlashbotsBundleResolution.BundleIncluded) {
                console.log(`Congrats, included in ${blockNumber + 1}`);

                // Generate Etherscan link for each transaction in the bundle
                for (const tx of flashbotsTransactionResponse.bundleTransactions) {
                    const etherscanLink = `https://etherscan.io/tx/${tx.hash}`;
                    console.log(`View on Etherscan: ${etherscanLink}`);
                }
                process.exit(0);
            }

            // Simulate the Flashbots transaction and log the result
            console.log(await flashbotsTransactionResponse.simulate());

            } catch (error) {
                console.error(error);
            }
        }
    );
}

safeTransfer();
