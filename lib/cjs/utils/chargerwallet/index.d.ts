import { dAppUtils } from './dapp';
declare const chargerwalletUtils: {
    composeTxPlan: (transferInfo: import("./types").ITransferInfo, accountXpub: string, utxos: import("./types").IAdaUTXO[], changeAddress: string, outputs: import("./types").IOutput[], options?: {
        debug: boolean;
    } | undefined) => Promise<import("../../types/types").PrecomposedTransaction>;
    signTransaction: (txBodyHex: string, address: string, accountIndex: number, utxos: import("./types").IAdaUTXO[], xprv: string, signOnly: boolean, partialSign?: boolean | undefined) => Promise<{
        signedTx: string;
        txid: string;
    }>;
    signTx: (keys: {
        accountKey: import("@emurgo/cardano-serialization-lib-browser").Bip32PrivateKey;
        paymentKey: import("@emurgo/cardano-serialization-lib-browser").PrivateKey;
        stakeKey: import("@emurgo/cardano-serialization-lib-browser").PrivateKey;
    }, tx: string, keyHashes: string[], partialSign?: boolean) => Promise<import("@emurgo/cardano-serialization-lib-browser").TransactionWitnessSet>;
    txToChargerWallet: (rawTx: string, network: number, initKeys: {
        payment: {
            hash: string | null;
            path: string | null;
        };
        stake: {
            hash: string | null;
            path: string | null;
        };
    }, xpub: string, changeAddress: import("./types").IChangeAddress) => Promise<{
        signingMode: import("./txToChargerWallet").CardanoTxSigningMode.ORDINARY_TRANSACTION | import("./txToChargerWallet").CardanoTxSigningMode.POOL_REGISTRATION_AS_OWNER | import("./txToChargerWallet").CardanoTxSigningMode.PLUTUS_TRANSACTION;
        outputs: never[];
        fee: string;
        ttl: string | null;
        validityIntervalStart: any;
        certificates: [] | null;
        withdrawals: null;
        auxiliaryData: {
            hash: string;
        } | null;
        mint: null;
        scriptDataHash: string | null;
        collateralInputs: null;
        requiredSigners: null;
        protocolMagic: number;
        networkId: number;
        includeNetworkId: boolean;
        additionalWitnessRequests: null;
        collateralReturn: null;
        totalCollateral: string | null;
        referenceInputs: null;
    }>;
};
export { chargerwalletUtils, dAppUtils };
