# Flashbots Transaction Bundler

## Description

The **Flashbots Transaction Bundler** is a Node.js application designed to create, sign, and send bundles of transactions to the Ethereum network using the Flashbots service. This application is specifically tailored for transferring ERC-1155 and ERC-721 tokens between wallets, ensuring that the transactions either all succeed or all fail, thereby minimizing the risk of loss due to failed transactions.

## Features

- **Batch Transfer of ERC-1155 Tokens**: Transfer multiple ERC-1155 tokens from one wallet to another in a single transaction.
- **Individual Transfer of ERC-721 Tokens**: Transfer individual ERC-721 tokens from one wallet to another.
- **Gas Price Management**: Calculate and set the optimal gas price for each transaction in the bundle.
- **Flashbots Integration**: Send transactions in a bundle using Flashbots, thereby bypassing the public mempool.

## Prerequisites

- Node.js (v14.0 or later)
- NPM (v6.0 or later)

## Installation

1. **Clone the Repository:**

    ```sh
    git clone https://github.com/codeesura/flashbots-transaction-bundler.git
    cd flashbots-transaction-bundler
    ```

2. **Install Dependencies:**

    ```sh
    npm install
    ```

3. **Configure Environment Variables:**

    Copy the `.env.example` file to a new file named `.env` and update it with your Ethereum wallet private keys and Infura project ID:

    ```sh
    cp .env.example .env
    nano .env
    ```

    Example `.env` file:

    ```env
    PRIVATE_KEY_SAFE_WALLET=YOUR_SAFE_WALLET_PRIVATE_KEY
    PRIVATE_KEY_HACK_WALLET=YOUR_HACK_WALLET_PRIVATE_KEY
    ```

## Usage

1. **Run the Application:**

    ```sh
    node flashbotmain.js
    ```

2. **Check the Console Output:**

    The application will log the status of each transaction in the bundle, including the gas price and the block number.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/codeesura/flashbots-transaction-bundler/blob/main/LICENSE) file for details.
