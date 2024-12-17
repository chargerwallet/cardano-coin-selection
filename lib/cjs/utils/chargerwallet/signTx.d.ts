import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser';
import { IAdaUTXO } from './types';
declare type SignKeys = {
    accountKey: CardanoWasm.Bip32PrivateKey;
    paymentKey: CardanoWasm.PrivateKey;
    stakeKey: CardanoWasm.PrivateKey;
};
export declare const signTransaction: (txBodyHex: string, address: string, accountIndex: number, utxos: IAdaUTXO[], xprv: string, signOnly: boolean, partialSign?: boolean) => Promise<{
    signedTx: string;
    txid: string;
}>;
/**
 *
 * @param {string} tx - cbor hex string
 * @param {Array<string>} keyHashes
 * @param {string} password
 * @returns {string} witness set as hex string
 */
export declare const signTx: (keys: SignKeys, tx: string, keyHashes: string[], partialSign?: boolean) => Promise<CardanoWasm.TransactionWitnessSet>;
export declare const getUtxos: (address: string, utxos: IAdaUTXO[]) => Promise<CardanoWasm.TransactionUnspentOutput[] | null>;
export declare const requestAccountKey: (xprv: string, accountIndex: number) => Promise<{
    accountKey: any;
    paymentKey: any;
    stakeKey: any;
}>;
export {};
