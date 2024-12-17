import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser';
import { IAdaAmount, IAdaUTXO, IChangeAddress, IEncodedTxADA } from './types';
export declare const assetsToValue: (assets: IAdaAmount[]) => Promise<CardanoWasm.Value>;
export declare const extractKeyHash: (address: string) => Promise<string>;
export declare const dAppUtils: {
    getBalance: (balances: IAdaAmount[]) => Promise<string>;
    getAddresses: (addresses: string[]) => Promise<string[]>;
    getUtxos: (address: string, utxos: IAdaUTXO[], amount?: string) => Promise<string[] | null | undefined>;
    convertCborTxToEncodeTx: (txHex: string, utxos: IAdaUTXO[], addresses: string[], changeAddress: IChangeAddress) => Promise<IEncodedTxADA>;
    signData: (address: string, payload: string, xprv: string, accountIndex: number) => Promise<{
        signature: string;
        key: string;
    }>;
};
