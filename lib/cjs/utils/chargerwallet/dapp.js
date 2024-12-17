"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dAppUtils = exports.extractKeyHash = exports.assetsToValue = void 0;
/* eslint-disable @typescript-eslint/no-non-null-assertion */
const CardanoWasm = __importStar(require("@emurgo/cardano-serialization-lib-browser"));
const CardanoMessage = __importStar(require("@emurgo/cardano-message-signing-browser/cardano_message_signing"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const signTx_1 = require("./signTx");
const error_1 = require("./error");
const getBalance = async (balances) => {
    const value = await (0, exports.assetsToValue)(balances);
    return Buffer.from(value.to_bytes(), 'hex').toString('hex');
};
const assetsToValue = async (assets) => {
    const multiAsset = CardanoWasm.MultiAsset.new();
    const lovelace = assets.find(asset => asset.unit === 'lovelace');
    const policies = [
        ...new Set(assets
            .filter(asset => asset.unit !== 'lovelace')
            .map(asset => asset.unit.slice(0, 56))),
    ];
    policies.forEach(policy => {
        const policyAssets = assets.filter(asset => asset.unit.slice(0, 56) === policy);
        const assetsValue = CardanoWasm.Assets.new();
        policyAssets.forEach(asset => {
            assetsValue.insert(CardanoWasm.AssetName.new(Buffer.from(asset.unit.slice(56), 'hex')), CardanoWasm.BigNum.from_str(asset.quantity));
        });
        multiAsset.insert(CardanoWasm.ScriptHash.from_bytes(Buffer.from(policy, 'hex')), assetsValue);
    });
    const value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(lovelace ? lovelace.quantity : '0'));
    if (assets.length > 1 || !lovelace)
        value.set_multiasset(multiAsset);
    return value;
};
exports.assetsToValue = assetsToValue;
const getAddresses = async (addresses) => {
    return addresses.map(address => {
        const addr = Buffer.from(CardanoWasm.Address.from_bech32(address).to_bytes(), 'hex').toString('hex');
        return addr;
    });
};
const getUtxos = async (address, utxos, amount) => {
    let converted = await (0, signTx_1.getUtxos)(address, utxos);
    // filter utxos
    if (amount) {
        let filterVaule;
        try {
            filterVaule = CardanoWasm.Value.from_bytes(Buffer.from(amount, 'hex'));
        }
        catch (e) {
            throw new Error('Invalid Request');
        }
        converted = converted === null || converted === void 0 ? void 0 : converted.filter(unspent => !unspent.output().amount().compare(filterVaule) ||
            unspent.output().amount().compare(filterVaule) !== -1);
    }
    if (amount && Array.isArray(converted) && converted.length <= 0) {
        return null;
    }
    return converted === null || converted === void 0 ? void 0 : converted.map(utxo => Buffer.from(utxo.to_bytes(), 'hex').toString('hex'));
};
const convertCborTxToEncodeTx = async (txHex, utxos, addresses, changeAddress) => {
    var _a, _b;
    const tx = CardanoWasm.Transaction.from_bytes(Buffer.from(txHex, 'hex'));
    const body = tx.body();
    // Fee
    const fee = body.fee().to_str();
    const totalFeeInNative = new bignumber_js_1.default(fee).shiftedBy(-1 * 6).toFixed();
    // inputs txs
    const encodeInputs = [];
    const inputs = [];
    const inputsLen = body.inputs().len();
    for (let i = 0; i < inputsLen; i++) {
        const input = body.inputs().get(i);
        const txHash = Buffer.from(input.transaction_id().to_bytes(), 'utf8').toString('hex');
        const index = input.index();
        inputs.push({ tx_hash: txHash, tx_index: index });
        const utxo = utxos.find(utxo => utxo.tx_hash === txHash && +utxo.tx_index === +index);
        encodeInputs.push(utxo);
    }
    // outputs txs
    const outputs = [];
    const outputsLen = body.outputs().len();
    for (let i = 0; i < outputsLen; i++) {
        const output = body.outputs().get(i);
        const address = output.address().to_bech32();
        const amount = output.amount().coin().to_str();
        // get the asset from output
        const assetsArray = [];
        const multiasset = output.amount().multiasset();
        if (multiasset) {
            const keys = multiasset.keys(); // policy Ids of thee multiasset
            const N = keys.len();
            // (`${N} Multiassets in the UTXO`)
            for (let i = 0; i < N; i++) {
                const policyId = keys.get(i);
                const policyIdHex = Buffer.from(policyId.to_bytes(), 'utf8').toString('hex');
                const assets = multiasset.get(policyId);
                if (assets) {
                    const assetNames = assets.keys();
                    const K = assetNames.len();
                    for (let j = 0; j < K; j++) {
                        const assetName = assetNames.get(j);
                        const assetNameHex = Buffer.from(assetName.name(), 'utf8').toString('hex');
                        const multiassetAmt = multiasset.get_asset(policyId, assetName);
                        assetsArray.push({
                            unit: `${policyIdHex}${assetNameHex}`,
                            quantity: multiassetAmt.to_str(),
                        });
                    }
                }
            }
        }
        // isChange: outputs length > 0 && address === changeAddress.address
        const isChange = i > 0 && address === changeAddress.address;
        outputs.push({
            amount: amount,
            address: address,
            assets: assetsArray,
            isChange,
        });
    }
    const totalSpent = bignumber_js_1.default.sum(...outputs.map(o => o.amount)).toFixed();
    const token = (_b = (_a = outputs
        .filter(o => !addresses.includes(o.address))
        .find(o => o.assets.length > 0)) === null || _a === void 0 ? void 0 : _a.assets) === null || _b === void 0 ? void 0 : _b[0].unit;
    const encodedTx = {
        inputs: encodeInputs.map(input => (Object.assign(Object.assign({}, input), { txHash: input.tx_hash, outputIndex: input.tx_index }))),
        outputs,
        fee,
        totalSpent,
        totalFeeInNative,
        transferInfo: {
            from: encodeInputs[0].address,
            to: outputs[0].address,
            amount: totalSpent,
            token,
        },
        tx: {
            body: body.to_hex(),
            hash: Buffer.from(CardanoWasm.hash_transaction(body).to_bytes(), 'utf8').toString('hex'),
            size: 0,
            rawTxHex: txHex,
        },
        signOnly: true,
    };
    console.log('Cardano DApp EncodedTx: ', encodedTx);
    return encodedTx;
};
const signData = async (address, payload, xprv, accountIndex) => {
    const keyHash = await (0, exports.extractKeyHash)(address);
    if (!keyHash) {
        throw error_1.DataSignError.InvalidFormat;
    }
    const prefix = keyHash.startsWith('addr_vkh') ? 'addr_vkh' : 'stake_vkh';
    const { paymentKey, stakeKey } = await (0, signTx_1.requestAccountKey)(xprv, accountIndex);
    const accountKey = prefix === 'addr_vkh' ? paymentKey : stakeKey;
    const publicKey = accountKey.to_public();
    if (keyHash !== publicKey.hash().to_bech32(prefix))
        throw error_1.DataSignError.ProofGeneration;
    const protectedHeaders = CardanoMessage.HeaderMap.new();
    protectedHeaders.set_algorithm_id(CardanoMessage.Label.from_algorithm_id(CardanoMessage.AlgorithmId.EdDSA));
    // protectedHeaders.set_key_id(publicKey.as_bytes()); // Removed to adhere to CIP-30
    protectedHeaders.set_header(CardanoMessage.Label.new_text('address'), CardanoMessage.CBORValue.new_bytes(Buffer.from(address, 'hex')));
    const protectedSerialized = CardanoMessage.ProtectedHeaderMap.new(protectedHeaders);
    const unprotectedHeaders = CardanoMessage.HeaderMap.new();
    const headers = CardanoMessage.Headers.new(protectedSerialized, unprotectedHeaders);
    const builder = CardanoMessage.COSESign1Builder.new(headers, Buffer.from(payload, 'hex'), false);
    const toSign = builder.make_data_to_sign().to_bytes();
    const signedSigStruc = accountKey.sign(toSign).to_bytes();
    const coseSign1 = builder.build(signedSigStruc);
    stakeKey.free();
    paymentKey.free();
    const key = CardanoMessage.COSEKey.new(CardanoMessage.Label.from_key_type(CardanoMessage.KeyType.OKP));
    key.set_algorithm_id(CardanoMessage.Label.from_algorithm_id(CardanoMessage.AlgorithmId.EdDSA));
    key.set_header(CardanoMessage.Label.new_int(CardanoMessage.Int.new_negative(CardanoMessage.BigNum.from_str('1'))), CardanoMessage.CBORValue.new_int(CardanoMessage.Int.new_i32(6))); // crv (-1) set to Ed25519 (6)
    key.set_header(CardanoMessage.Label.new_int(CardanoMessage.Int.new_negative(CardanoMessage.BigNum.from_str('2'))), CardanoMessage.CBORValue.new_bytes(publicKey.as_bytes())); // x (-2) set to public key
    return {
        signature: Buffer.from(coseSign1.to_bytes()).toString('hex'),
        key: Buffer.from(key.to_bytes()).toString('hex'),
    };
};
const extractKeyHash = async (address) => {
    var _a;
    try {
        const addr = CardanoWasm.BaseAddress.from_address(CardanoWasm.Address.from_bytes(Buffer.from(address, 'hex')));
        return (_a = addr.payment_cred()) === null || _a === void 0 ? void 0 : _a.to_keyhash().to_bech32('addr_vkh');
    }
    catch (e) {
        // ignore
    }
    try {
        const addr = CardanoWasm.EnterpriseAddress.from_address(CardanoWasm.Address.from_bytes(Buffer.from(address, 'hex')));
        return addr.payment_cred().to_keyhash().to_bech32('addr_vkh');
    }
    catch (e) {
        // ignore
    }
    try {
        const addr = CardanoWasm.PointerAddress.from_address(CardanoWasm.Address.from_bytes(Buffer.from(address, 'hex')));
        return addr.payment_cred().to_keyhash().to_bech32('addr_vkh');
    }
    catch (e) {
        // ignore
    }
    try {
        const addr = CardanoWasm.RewardAddress.from_address(CardanoWasm.Address.from_bytes(Buffer.from(address, 'hex')));
        return addr.payment_cred().to_keyhash().to_bech32('stake_vkh');
    }
    catch (e) {
        // ignore
    }
    throw error_1.DataSignError.AddressNotPK;
};
exports.extractKeyHash = extractKeyHash;
exports.dAppUtils = {
    getBalance,
    getAddresses,
    getUtxos,
    convertCborTxToEncodeTx,
    signData,
};
