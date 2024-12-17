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
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestAccountKey = exports.getUtxos = exports.signTx = exports.signTransaction = void 0;
const CardanoWasm = __importStar(require("@emurgo/cardano-serialization-lib-browser"));
const error_1 = require("./error");
const signTransaction = async (txBodyHex, address, accountIndex, utxos, xprv, signOnly, partialSign) => {
    const { paymentKey, stakeKey, accountKey } = await (0, exports.requestAccountKey)(xprv, accountIndex);
    const serializedUtxos = await (0, exports.getUtxos)(address, utxos);
    if (!serializedUtxos || serializedUtxos === null) {
        throw new Error('no utxos');
    }
    const transactionWitnessSet = CardanoWasm.TransactionWitnessSet.new();
    const rawTx = CardanoWasm.Transaction.new(CardanoWasm.TransactionBody.from_hex(txBodyHex), CardanoWasm.TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes()));
    const keyHashes = await getKeyHashes(rawTx, serializedUtxos, { paymentAddr: address });
    const witnessSet = await (0, exports.signTx)({ paymentKey, stakeKey, accountKey }, Buffer.from(rawTx.to_bytes(), 'utf8').toString('hex'), keyHashes.key, partialSign);
    if (signOnly) {
        return {
            signedTx: Buffer.from(witnessSet.to_bytes(), 'utf8').toString('hex'),
            txid: '',
        };
    }
    const transaction = CardanoWasm.Transaction.new(rawTx.body(), witnessSet, rawTx.auxiliary_data());
    const signedTx = Buffer.from(transaction.to_bytes(), 'hex').toString('hex');
    const hash = CardanoWasm.hash_transaction(transaction.body()).to_hex();
    return {
        signedTx,
        txid: hash,
    };
};
exports.signTransaction = signTransaction;
/**
 *
 * @param {string} tx - cbor hex string
 * @param {Array<string>} keyHashes
 * @param {string} password
 * @returns {string} witness set as hex string
 */
const signTx = async (keys, tx, keyHashes, partialSign = false) => {
    const { paymentKey, stakeKey } = keys;
    const paymentKeyHash = Buffer.from(paymentKey === null || paymentKey === void 0 ? void 0 : paymentKey.to_public().hash().to_bytes(), 'hex').toString('hex');
    const stakeKeyHash = Buffer.from(stakeKey.to_public().hash().to_bytes(), 'hex').toString('hex');
    const rawTx = CardanoWasm.Transaction.from_bytes(Buffer.from(tx, 'hex'));
    const txWitnessSet = CardanoWasm.TransactionWitnessSet.new();
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    const txHash = CardanoWasm.hash_transaction(rawTx.body());
    keyHashes.forEach(keyHash => {
        let signingKey;
        if (keyHash === paymentKeyHash)
            signingKey = paymentKey;
        else if (keyHash === stakeKeyHash)
            signingKey = stakeKey;
        else if (!partialSign)
            throw error_1.TxSignError.ProofGeneration;
        else
            return;
        const vkey = CardanoWasm.make_vkey_witness(txHash, signingKey);
        vkeyWitnesses.add(vkey);
    });
    stakeKey.free();
    // stakeKey = null;
    paymentKey.free();
    // paymentKey = null;
    txWitnessSet.set_vkeys(vkeyWitnesses);
    return txWitnessSet;
};
exports.signTx = signTx;
const getKeyHashes = async (tx, utxos, account) => {
    var _a, _b, _c, _d;
    let requiredKeyHashes = [];
    const baseAddr = CardanoWasm.BaseAddress.from_address(CardanoWasm.Address.from_bech32(account.paymentAddr));
    if (!baseAddr)
        return { key: [], keyKind: [] };
    const paymentKeyHash = Buffer.from((_b = (_a = baseAddr.payment_cred().to_keyhash()) === null || _a === void 0 ? void 0 : _a.to_bytes()) !== null && _b !== void 0 ? _b : '').toString('hex');
    const stakeKeyHash = Buffer.from((_d = (_c = baseAddr.stake_cred().to_keyhash()) === null || _c === void 0 ? void 0 : _c.to_bytes()) !== null && _d !== void 0 ? _d : '').toString('hex');
    //get key hashes from inputs
    const inputs = tx.body().inputs();
    for (let i = 0; i < inputs.len(); i++) {
        const input = inputs.get(i);
        const txHash = Buffer.from(input.transaction_id().to_bytes()).toString('hex');
        const index = input.index();
        if (utxos.some(utxo => Buffer.from(utxo.input().transaction_id().to_bytes()).toString('hex') === txHash && utxo.input().index() === index)) {
            requiredKeyHashes.push(paymentKeyHash);
        }
        else {
            requiredKeyHashes.push('<not_owned_key_hash>');
        }
    }
    //get key hashes from certificates
    const txBody = tx.body();
    const keyHashFromCert = txBody => {
        for (let i = 0; i < txBody.certs().len(); i++) {
            const cert = txBody.certs().get(i);
            if (cert.kind() === 0) {
                const credential = cert.as_stake_registration().stake_credential();
                if (credential.kind() === 0) {
                    // stake registration doesn't required key hash
                }
            }
            else if (cert.kind() === 1) {
                const credential = cert.as_stake_deregistration().stake_credential();
                if (credential.kind() === 0) {
                    const keyHash = Buffer.from(credential.to_keyhash().to_bytes()).toString('hex');
                    requiredKeyHashes.push(keyHash);
                }
            }
            else if (cert.kind() === 2) {
                const credential = cert.as_stake_delegation().stake_credential();
                if (credential.kind() === 0) {
                    const keyHash = Buffer.from(credential.to_keyhash().to_bytes()).toString('hex');
                    requiredKeyHashes.push(keyHash);
                }
            }
            else if (cert.kind() === 3) {
                const owners = cert.as_pool_registration().pool_params().pool_owners();
                for (let i = 0; i < owners.len(); i++) {
                    const keyHash = Buffer.from(owners.get(i).to_bytes()).toString('hex');
                    requiredKeyHashes.push(keyHash);
                }
            }
            else if (cert.kind() === 4) {
                const operator = cert.as_pool_retirement().pool_keyhash().to_hex();
                requiredKeyHashes.push(operator);
            }
            else if (cert.kind() === 6) {
                const instant_reward = cert
                    .as_move_instantaneous_rewards_cert()
                    .move_instantaneous_reward()
                    .as_to_stake_creds()
                    .keys();
                for (let i = 0; i < instant_reward.len(); i++) {
                    const credential = instant_reward.get(i);
                    if (credential.kind() === 0) {
                        const keyHash = Buffer.from(credential.to_keyhash().to_bytes()).toString('hex');
                        requiredKeyHashes.push(keyHash);
                    }
                }
            }
        }
    };
    if (txBody.certs())
        keyHashFromCert(txBody);
    // key hashes from withdrawals
    const withdrawals = txBody.withdrawals();
    const keyHashFromWithdrawal = withdrawals => {
        const rewardAddresses = withdrawals.keys();
        for (let i = 0; i < rewardAddresses.len(); i++) {
            const credential = rewardAddresses.get(i).payment_cred();
            if (credential.kind() === 0) {
                requiredKeyHashes.push(credential.to_keyhash().to_hex());
            }
        }
    };
    if (withdrawals)
        keyHashFromWithdrawal(withdrawals);
    //get key hashes from scripts
    const scripts = tx.witness_set().native_scripts();
    const keyHashFromScript = scripts => {
        for (let i = 0; i < scripts.len(); i++) {
            const script = scripts.get(i);
            if (script.kind() === 0) {
                const keyHash = Buffer.from(script.as_script_pubkey().addr_keyhash().to_bytes()).toString('hex');
                requiredKeyHashes.push(keyHash);
            }
            if (script.kind() === 1) {
                return keyHashFromScript(script.as_script_all().native_scripts());
            }
            if (script.kind() === 2) {
                return keyHashFromScript(script.as_script_any().native_scripts());
            }
            if (script.kind() === 3) {
                return keyHashFromScript(script.as_script_n_of_k().native_scripts());
            }
        }
    };
    if (scripts)
        keyHashFromScript(scripts);
    //get keyHashes from required signers
    const requiredSigners = tx.body().required_signers();
    if (requiredSigners) {
        for (let i = 0; i < requiredSigners.len(); i++) {
            requiredKeyHashes.push(Buffer.from(requiredSigners.get(i).to_bytes()).toString('hex'));
        }
    }
    //get keyHashes from collateral
    const collateral = txBody.collateral();
    if (collateral) {
        // TODO: Collateral KeyHashed
        // for (let i = 0; i < collateral.len(); i++) {
        //   const c = collateral.get(i);
        //   const utxo = await getSpecificUtxo(
        //     Buffer.from(c.transaction_id().to_bytes()).toString('hex'),
        //     c.index(),
        //   );
        //   if (utxo) {
        //     const address = CardanoWasm.Address.from_bech32(utxo.address);
        //     requiredKeyHashes.push(await getPaymentKeyHash(address));
        //   }
        // }
    }
    const keyKind = [];
    requiredKeyHashes = [...new Set(requiredKeyHashes)];
    if (requiredKeyHashes.includes(paymentKeyHash))
        keyKind.push('payment');
    if (requiredKeyHashes.includes(stakeKeyHash))
        keyKind.push('stake');
    return {
        key: requiredKeyHashes,
        keyKind,
    };
};
const getUtxos = async (address, utxos) => {
    const paymentAddr = getPaymentHexAddress(address);
    const converted = utxos.map(utxo => utxoFromJson(utxo, paymentAddr));
    if (converted.length <= 0) {
        return null;
    }
    return Promise.resolve(converted);
};
exports.getUtxos = getUtxos;
const getPaymentHexAddress = (address) => {
    const paymentAddr = Buffer.from(CardanoWasm.Address.from_bech32(address).to_bytes(), 'hex').toString('hex');
    return paymentAddr;
};
/**
 *
 * @param {JSON} output
 * @param {BaseAddress} address
 * @returns
 */
const utxoFromJson = (output, address) => CardanoWasm.TransactionUnspentOutput.new(CardanoWasm.TransactionInput.new(CardanoWasm.TransactionHash.from_bytes(Buffer.from(output.tx_hash, 'hex')), Number(output.output_index)), CardanoWasm.TransactionOutput.new(CardanoWasm.Address.from_bytes(Buffer.from(address, 'hex')), assetsToValue(output.amount)));
const assetsToValue = (assets) => {
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
    if (assets.length > 1 || !lovelace) {
        value.set_multiasset(multiAsset);
    }
    return value;
};
const harden = (num) => {
    return 0x80000000 + num;
};
const requestAccountKey = async (xprv, accountIndex) => {
    let accountKey;
    try {
        accountKey = CardanoWasm.Bip32PrivateKey.from_bech32(xprv)
            .derive(harden(1852)) // purpose
            .derive(harden(1815)) // coin type;
            .derive(harden(parseInt(`${accountIndex}`)));
    }
    catch (e) {
        throw new Error('Wrong private key');
    }
    return {
        accountKey,
        paymentKey: accountKey.derive(0).derive(0).to_raw_key(),
        stakeKey: accountKey.derive(2).derive(0).to_raw_key(),
    };
};
exports.requestAccountKey = requestAccountKey;
