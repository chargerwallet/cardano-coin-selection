import type { IChangeAddress } from './types';
export declare enum CardanoAddressType {
    BASE = 0,
    BASE_SCRIPT_KEY = 1,
    BASE_KEY_SCRIPT = 2,
    BASE_SCRIPT_SCRIPT = 3,
    POINTER = 4,
    POINTER_SCRIPT = 5,
    ENTERPRISE = 6,
    ENTERPRISE_SCRIPT = 7,
    BYRON = 8,
    REWARD = 14,
    REWARD_SCRIPT = 15
}
export declare enum CardanoTxSigningMode {
    ORDINARY_TRANSACTION = 0,
    POOL_REGISTRATION_AS_OWNER = 1,
    MULTISIG_TRANSACTION = 2,
    PLUTUS_TRANSACTION = 3
}
export declare enum CardanoCertificateType {
    STAKE_REGISTRATION = 0,
    STAKE_DEREGISTRATION = 1,
    STAKE_DELEGATION = 2,
    STAKE_POOL_REGISTRATION = 3
}
export declare enum CardanoPoolRelayType {
    SINGLE_HOST_IP = 0,
    SINGLE_HOST_NAME = 1,
    MULTIPLE_HOST_NAME = 2
}
declare type Key = {
    hash: string | null;
    path: string | null;
};
declare type Keys = {
    payment: Key;
    stake: Key;
};
/**
 *
 * @param {Transaction} tx
 */
export declare const txToChargerWallet: (rawTx: string, network: number, initKeys: Keys, xpub: string, changeAddress: IChangeAddress) => Promise<{
    signingMode: CardanoTxSigningMode.ORDINARY_TRANSACTION | CardanoTxSigningMode.POOL_REGISTRATION_AS_OWNER | CardanoTxSigningMode.PLUTUS_TRANSACTION;
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
export {};
