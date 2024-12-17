export declare type ITransferInfo = {
    from: string;
    to: string;
    amount: string;
    token?: string;
    isNFT?: boolean;
    tokenId?: string;
    type?: string;
};
export declare type IAdaAmount = {
    unit: string;
    quantity: string;
};
export declare type IAdaUTXO = {
    path: string;
    address: string;
    tx_hash: string;
    tx_index: number;
    output_index: number;
    amount: IAdaAmount[];
};
export declare type IOutput = {
    address: string;
    amount: string;
    assets: [];
};
export declare type IEncodeInput = {
    address: string;
    amount: IAdaAmount[];
    block: string;
    data_hash: string;
    outputIndex: number;
    txHash: string;
    tx_hash: string;
    tx_index: number;
};
export declare type IEncodeOutput = {
    address: string;
    amount: string;
    assets: IAdaAmount[];
    isChange?: boolean;
};
declare type ITxInfo = {
    body: string;
    hash: string;
    size: number;
};
export declare type IEncodedTxADA = {
    inputs: IEncodeInput[];
    outputs: IEncodeOutput[];
    fee: string;
    totalSpent: string;
    totalFeeInNative: string;
    transferInfo: ITransferInfo;
    tx: ITxInfo;
    signOnly?: boolean;
};
declare enum CardanoAddressType {
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
export declare type IChangeAddress = {
    address: string;
    addressParameters: {
        path: string;
        addressType: CardanoAddressType;
        stakingPath: string;
    };
};
export {};
