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
exports.txToChargerWallet = exports.CardanoPoolRelayType = exports.CardanoCertificateType = exports.CardanoTxSigningMode = exports.CardanoAddressType = void 0;
// @ts-nocheck
const CardanoWasm = __importStar(require("@emurgo/cardano-serialization-lib-browser"));
var CardanoAddressType;
(function (CardanoAddressType) {
    CardanoAddressType[CardanoAddressType["BASE"] = 0] = "BASE";
    CardanoAddressType[CardanoAddressType["BASE_SCRIPT_KEY"] = 1] = "BASE_SCRIPT_KEY";
    CardanoAddressType[CardanoAddressType["BASE_KEY_SCRIPT"] = 2] = "BASE_KEY_SCRIPT";
    CardanoAddressType[CardanoAddressType["BASE_SCRIPT_SCRIPT"] = 3] = "BASE_SCRIPT_SCRIPT";
    CardanoAddressType[CardanoAddressType["POINTER"] = 4] = "POINTER";
    CardanoAddressType[CardanoAddressType["POINTER_SCRIPT"] = 5] = "POINTER_SCRIPT";
    CardanoAddressType[CardanoAddressType["ENTERPRISE"] = 6] = "ENTERPRISE";
    CardanoAddressType[CardanoAddressType["ENTERPRISE_SCRIPT"] = 7] = "ENTERPRISE_SCRIPT";
    CardanoAddressType[CardanoAddressType["BYRON"] = 8] = "BYRON";
    CardanoAddressType[CardanoAddressType["REWARD"] = 14] = "REWARD";
    CardanoAddressType[CardanoAddressType["REWARD_SCRIPT"] = 15] = "REWARD_SCRIPT";
})(CardanoAddressType = exports.CardanoAddressType || (exports.CardanoAddressType = {}));
var CardanoTxSigningMode;
(function (CardanoTxSigningMode) {
    CardanoTxSigningMode[CardanoTxSigningMode["ORDINARY_TRANSACTION"] = 0] = "ORDINARY_TRANSACTION";
    CardanoTxSigningMode[CardanoTxSigningMode["POOL_REGISTRATION_AS_OWNER"] = 1] = "POOL_REGISTRATION_AS_OWNER";
    CardanoTxSigningMode[CardanoTxSigningMode["MULTISIG_TRANSACTION"] = 2] = "MULTISIG_TRANSACTION";
    CardanoTxSigningMode[CardanoTxSigningMode["PLUTUS_TRANSACTION"] = 3] = "PLUTUS_TRANSACTION";
})(CardanoTxSigningMode = exports.CardanoTxSigningMode || (exports.CardanoTxSigningMode = {}));
var CardanoCertificateType;
(function (CardanoCertificateType) {
    CardanoCertificateType[CardanoCertificateType["STAKE_REGISTRATION"] = 0] = "STAKE_REGISTRATION";
    CardanoCertificateType[CardanoCertificateType["STAKE_DEREGISTRATION"] = 1] = "STAKE_DEREGISTRATION";
    CardanoCertificateType[CardanoCertificateType["STAKE_DELEGATION"] = 2] = "STAKE_DELEGATION";
    CardanoCertificateType[CardanoCertificateType["STAKE_POOL_REGISTRATION"] = 3] = "STAKE_POOL_REGISTRATION";
})(CardanoCertificateType = exports.CardanoCertificateType || (exports.CardanoCertificateType = {}));
var CardanoPoolRelayType;
(function (CardanoPoolRelayType) {
    CardanoPoolRelayType[CardanoPoolRelayType["SINGLE_HOST_IP"] = 0] = "SINGLE_HOST_IP";
    CardanoPoolRelayType[CardanoPoolRelayType["SINGLE_HOST_NAME"] = 1] = "SINGLE_HOST_NAME";
    CardanoPoolRelayType[CardanoPoolRelayType["MULTIPLE_HOST_NAME"] = 2] = "MULTIPLE_HOST_NAME";
})(CardanoPoolRelayType = exports.CardanoPoolRelayType || (exports.CardanoPoolRelayType = {}));
const generateKeys = (keys, xpub) => {
    const publicKey = CardanoWasm.Bip32PublicKey.from_bytes(Buffer.from(xpub, 'hex'));
    const paymentKeyHashRaw = publicKey.derive(0).derive(0).to_raw_key().hash();
    const stakeKeyHashRaw = publicKey.derive(2).derive(0).to_raw_key().hash();
    const paymentKeyHash = Buffer.from(paymentKeyHashRaw.to_bytes()).toString('hex');
    const stakeKeyHash = Buffer.from(stakeKeyHashRaw.to_bytes()).toString('hex');
    return {
        payment: Object.assign(Object.assign({}, keys.payment), { hash: paymentKeyHash }),
        stake: Object.assign(Object.assign({}, keys.stake), { hash: stakeKeyHash }),
    };
};
const outputsToChargerWallet = (outputs, changeAddress) => {
    var _a, _b;
    const chargerwalletOutputs = [];
    for (let i = 0; i < outputs.len(); i++) {
        const output = outputs.get(i);
        const multiAsset = output.amount().multiasset();
        let tokenBundle = null;
        if (multiAsset) {
            tokenBundle = [];
            for (let j = 0; j < multiAsset.keys().len(); j++) {
                const policy = multiAsset.keys().get(j);
                const assets = multiAsset.get(policy);
                const tokens = [];
                for (let k = 0; k < assets.keys().len(); k++) {
                    const assetName = assets.keys().get(k);
                    const amount = assets.get(assetName).to_str();
                    tokens.push({
                        assetNameBytes: Buffer.from(assetName.name()).toString('hex'),
                        amount,
                    });
                }
                // sort canonical
                tokens.sort((a, b) => {
                    if (a.assetNameBytes.length == b.assetNameBytes.length) {
                        return a.assetNameBytes > b.assetNameBytes ? 1 : -1;
                    }
                    else if (a.assetNameBytes.length > b.assetNameBytes.length)
                        return 1;
                    else
                        return -1;
                });
                tokenBundle.push({
                    policyId: Buffer.from(policy.to_bytes()).toString('hex'),
                    tokenAmounts: tokens,
                });
            }
        }
        const outputAddressBech32 = output.address().to_bech32();
        const outputAddressHuman = (() => {
            try {
                return CardanoWasm.BaseAddress.from_address(output.address())
                    .to_address()
                    .to_bech32();
            }
            catch (e) {
                // ignore
            }
            try {
                return CardanoWasm.EnterpriseAddress.from_address(output.address())
                    .to_address()
                    .to_bech32();
            }
            catch (e) {
                // ignore
            }
            try {
                return CardanoWasm.PointerAddress.from_address(output.address())
                    .to_address()
                    .to_bech32();
            }
            catch (e) {
                // ignore
            }
            return CardanoWasm.ByronAddress.from_address(output.address()).to_base58();
        })();
        const destination = outputAddressBech32 === changeAddress.address
            ? {
                addressParameters: {
                    addressType: CardanoAddressType.BASE,
                    path: changeAddress.addressParameters.path,
                    stakingPath: changeAddress.addressParameters.stakingPath,
                },
            }
            : {
                address: outputAddressHuman,
            };
        const datumHash = (!output.has_plutus_data() ||
            (output.has_plutus_data() && ((_a = output.plutus_data()) === null || _a === void 0 ? void 0 : _a.kind()) === 0)) &&
            output.has_data_hash()
            ? output.data_hash().to_hex()
            : null;
        const inlineDatum = output.has_data_hash() &&
            output.has_plutus_data() &&
            ((_b = output.plutus_data()) === null || _b === void 0 ? void 0 : _b.kind()) === 1
            ? output.data_hash().to_hex()
            : null;
        // const datumHash =
        //   output.datum() && output.datum().kind() === 0
        //     ? Buffer.from(output.datum().as_data_hash().to_bytes()).toString('hex')
        //     : null;
        // const inlineDatum =
        //   output.datum() && output.datum().kind() === 1
        //     ? Buffer.from(output.datum().as_data().get().to_bytes()).toString('hex')
        //     : null;
        const referenceScript = output.script_ref()
            ? Buffer.from(output.script_ref().get().to_bytes()).toString('hex')
            : null;
        const outputRes = Object.assign({ amount: output.amount().coin().to_str(), tokenBundle,
            datumHash, format: inlineDatum || referenceScript ? 1 : 0, inlineDatum,
            referenceScript }, destination);
        if (!tokenBundle)
            delete outputRes.tokenBundle;
        if (!datumHash)
            delete outputRes.datumHash;
        if (!inlineDatum)
            delete outputRes.inlineDatum;
        if (!referenceScript)
            delete outputRes.referenceScript;
        chargerwalletOutputs.push(outputRes);
    }
    return chargerwalletOutputs;
};
/**
 *
 * @param {Transaction} tx
 */
const txToChargerWallet = async (rawTx, network, initKeys, xpub, changeAddress) => {
    var _a;
    const keys = generateKeys(initKeys, xpub);
    const tx = CardanoWasm.Transaction.from_bytes(Buffer.from(rawTx, 'hex'));
    let signingMode = CardanoTxSigningMode.ORDINARY_TRANSACTION;
    const outputs = tx.body().outputs();
    const chargerwalletOutputs = outputsToChargerWallet(outputs, changeAddress);
    let chargerwalletCertificates = null;
    const certificates = tx.body().certs();
    if (certificates) {
        chargerwalletCertificates = [];
        for (let i = 0; i < certificates.len(); i++) {
            const cert = certificates.get(i);
            const certificate = {};
            if (cert.kind() === 0) {
                const credential = (_a = cert.as_stake_registration()) === null || _a === void 0 ? void 0 : _a.stake_credential();
                certificate.type = CardanoCertificateType.STAKE_REGISTRATION;
                if ((credential === null || credential === void 0 ? void 0 : credential.kind()) === 0) {
                    certificate.path = keys.stake.path;
                }
                else {
                    const scriptHash = Buffer.from(credential.to_scripthash().to_bytes()).toString('hex');
                    certificate.scriptHash = scriptHash;
                }
            }
            else if (cert.kind() === 1) {
                const credential = cert.as_stake_deregistration().stake_credential();
                certificate.type = CardanoCertificateType.STAKE_DEREGISTRATION;
                if (credential.kind() === 0) {
                    certificate.path = keys.stake.path;
                }
                else {
                    const scriptHash = Buffer.from(credential.to_scripthash().to_bytes()).toString('hex');
                    certificate.scriptHash = scriptHash;
                }
            }
            else if (cert.kind() === 2) {
                const delegation = cert.as_stake_delegation();
                const credential = delegation.stake_credential();
                const poolKeyHashHex = Buffer.from(delegation.pool_keyhash().to_bytes()).toString('hex');
                certificate.type = CardanoCertificateType.STAKE_DELEGATION;
                if (credential.kind() === 0) {
                    certificate.path = keys.stake.path;
                }
                else {
                    const scriptHash = Buffer.from(credential.to_scripthash().to_bytes()).toString('hex');
                    certificate.scriptHash = scriptHash;
                }
                certificate.pool = poolKeyHashHex;
            }
            else if (cert.kind() === 3) {
                const params = cert.as_pool_registration().pool_params();
                certificate.type = CardanoCertificateType.STAKE_POOL_REGISTRATION;
                const owners = params.pool_owners();
                const poolOwners = [];
                for (let i = 0; i < owners.len(); i++) {
                    const keyHash = Buffer.from(owners.get(i).to_bytes()).toString('hex');
                    if (keyHash == keys.stake.hash) {
                        signingMode = CardanoTxSigningMode.POOL_REGISTRATION_AS_OWNER;
                        poolOwners.push({
                            stakingKeyPath: keys.stake.path,
                        });
                    }
                    else {
                        poolOwners.push({
                            stakingKeyHash: keyHash,
                        });
                    }
                }
                const relays = params.relays();
                const chargerwalletRelays = [];
                for (let i = 0; i < relays.len(); i++) {
                    const relay = relays.get(i);
                    if (relay.kind() === 0) {
                        const singleHostAddr = relay.as_single_host_addr();
                        const type = CardanoPoolRelayType.SINGLE_HOST_IP;
                        const port = singleHostAddr.port();
                        const ipv4Address = singleHostAddr.ipv4()
                            ? bytesToIp(singleHostAddr.ipv4().ip())
                            : null;
                        const ipv6Address = singleHostAddr.ipv6()
                            ? bytesToIp(singleHostAddr.ipv6().ip())
                            : null;
                        chargerwalletRelays.push({ type, port, ipv4Address, ipv6Address });
                    }
                    else if (relay.kind() === 1) {
                        const type = CardanoPoolRelayType.SINGLE_HOST_NAME;
                        const singleHostName = relay.as_single_host_name();
                        const port = singleHostName.port();
                        const hostName = singleHostName.dns_name().record();
                        chargerwalletRelays.push({
                            type,
                            port,
                            hostName,
                        });
                    }
                    else if (relay.kind() === 2) {
                        const type = CardanoPoolRelayType.MULTIPLE_HOST_NAME;
                        const multiHostName = relay.as_multi_host_name();
                        const hostName = multiHostName.dns_name();
                        chargerwalletRelays.push({
                            type,
                            hostName,
                        });
                    }
                }
                const cost = params.cost().to_str();
                const margin = params.margin();
                const pledge = params.pledge().to_str();
                const poolId = Buffer.from(params.operator().to_bytes()).toString('hex');
                const metadata = params.pool_metadata()
                    ? {
                        url: params.pool_metadata().url().url(),
                        hash: Buffer.from(params.pool_metadata().pool_metadata_hash().to_bytes()).toString('hex'),
                    }
                    : null;
                const rewardAccount = params.reward_account().to_address().to_bech32();
                const vrfKeyHash = Buffer.from(params.vrf_keyhash().to_bytes()).toString('hex');
                certificate.poolParameters = {
                    poolId,
                    vrfKeyHash,
                    pledge,
                    cost,
                    margin: {
                        numerator: margin.numerator().to_str(),
                        denominator: margin.denominator().to_str(),
                    },
                    rewardAccount,
                    owners: poolOwners,
                    relays: chargerwalletRelays,
                    metadata,
                };
            }
            chargerwalletCertificates.push(certificate);
        }
    }
    const fee = tx.body().fee().to_str();
    const ttl = tx.body().ttl();
    const withdrawals = tx.body().withdrawals();
    let chargerwalletWithdrawals = null;
    if (withdrawals) {
        chargerwalletWithdrawals = [];
        for (let i = 0; i < withdrawals.keys().len(); i++) {
            const withdrawal = {};
            const rewardAddress = withdrawals.keys().get(i);
            if (rewardAddress.payment_cred().kind() === 0) {
                withdrawal.path = keys.stake.path;
            }
            else {
                withdrawal.scriptHash = Buffer.from(rewardAddress.payment_cred().to_scripthash().to_bytes()).toString('hex');
            }
            withdrawal.amount = withdrawals.get(rewardAddress).to_str();
            chargerwalletWithdrawals.push(withdrawal);
        }
    }
    const auxiliaryData = tx.body().auxiliary_data_hash()
        ? {
            hash: Buffer.from(tx.body().auxiliary_data_hash().to_bytes()).toString('hex'),
        }
        : null;
    const validityIntervalStart = tx.body().validity_start_interval()
        ? tx.body().validity_start_interval().to_str()
        : null;
    const mint = tx.body().mint();
    let additionalWitnessRequests = null;
    let mintBundle = null;
    if (mint) {
        mintBundle = [];
        for (let j = 0; j < mint.keys().len(); j++) {
            const policy = mint.keys().get(j);
            const assets = mint.get(policy);
            const tokens = [];
            for (let k = 0; k < assets.keys().len(); k++) {
                const assetName = assets.keys().get(k);
                const amount = assets.get(assetName);
                tokens.push({
                    assetNameBytes: Buffer.from(assetName.name()).toString('hex'),
                    mintAmount: amount.is_positive()
                        ? amount.as_positive().to_str()
                        : '-' + amount.as_negative().to_str(),
                });
            }
            // sort canonical
            tokens.sort((a, b) => {
                if (a.assetNameBytes.length == b.assetNameBytes.length) {
                    return a.assetNameBytes > b.assetNameBytes ? 1 : -1;
                }
                else if (a.assetNameBytes.length > b.assetNameBytes.length)
                    return 1;
                else
                    return -1;
            });
            mintBundle.push({
                policyId: Buffer.from(policy.to_bytes()).toString('hex'),
                tokenAmounts: tokens,
            });
        }
        additionalWitnessRequests = [];
        if (keys.payment.path)
            additionalWitnessRequests.push(keys.payment.path);
        if (keys.stake.path)
            additionalWitnessRequests.push(keys.stake.path);
    }
    // Plutus
    const scriptDataHash = tx.body().script_data_hash()
        ? Buffer.from(tx.body().script_data_hash().to_bytes()).toString('hex')
        : null;
    let collateralInputs = null;
    if (tx.body().collateral()) {
        collateralInputs = [];
        const coll = tx.body().collateral();
        for (let i = 0; i < coll.len(); i++) {
            const input = coll.get(i);
            if (keys.payment.path) {
                collateralInputs.push({
                    prev_hash: Buffer.from(input.transaction_id().to_bytes()).toString('hex'),
                    prev_index: parseInt(input.index()),
                    path: keys.payment.path, // needed to include payment key witness if available
                });
            }
            else {
                collateralInputs.push({
                    prev_hash: Buffer.from(input.transaction_id().to_bytes()).toString('hex'),
                    prev_index: parseInt(input.index()),
                });
            }
            signingMode = CardanoTxSigningMode.PLUTUS_TRANSACTION;
        }
    }
    let requiredSigners = null;
    if (tx.body().required_signers()) {
        requiredSigners = [];
        const r = tx.body().required_signers();
        for (let i = 0; i < r.len(); i++) {
            const signer = Buffer.from(r.get(i).to_bytes()).toString('hex');
            if (signer === keys.payment.hash) {
                requiredSigners.push({
                    keyPath: keys.payment.path,
                });
            }
            else {
                requiredSigners.push({
                    keyHash: signer,
                });
            }
        }
        signingMode = CardanoTxSigningMode.PLUTUS_TRANSACTION;
    }
    let referenceInputs = null;
    if (tx.body().reference_inputs()) {
        referenceInputs = [];
        const ri = tx.body().reference_inputs();
        for (let i = 0; i < ri.len(); i++) {
            referenceInputs.push({
                prev_hash: ri.get(i).transaction_id().to_hex(),
                prev_index: parseInt(ri.get(i).index().to_str()),
            });
        }
        signingMode = CardanoTxSigningMode.PLUTUS_TRANSACTION;
    }
    const totalCollateral = tx.body().total_collateral()
        ? tx.body().total_collateral().to_str()
        : null;
    const collateralReturn = (() => {
        if (tx.body().collateral_return()) {
            const outputs = CardanoWasm.TransactionOutputs.new();
            outputs.add(tx.body().collateral_return());
            const [out] = outputsToChargerWallet(outputs, changeAddress);
            return out;
        }
        return null;
    })();
    const includeNetworkId = !!tx.body().network_id();
    const chargerwalletTx = {
        signingMode,
        outputs: chargerwalletOutputs,
        fee,
        ttl: ttl ? `${ttl}` : null,
        validityIntervalStart,
        certificates: chargerwalletCertificates,
        withdrawals: chargerwalletWithdrawals,
        auxiliaryData,
        mint: mintBundle,
        scriptDataHash,
        collateralInputs,
        requiredSigners,
        protocolMagic: network === 1 ? 764824073 : 42,
        networkId: network,
        includeNetworkId,
        additionalWitnessRequests,
        collateralReturn,
        totalCollateral,
        referenceInputs,
    };
    Object.keys(chargerwalletTx).forEach(key => !chargerwalletTx[key] && chargerwalletTx[key] != 0 && delete chargerwalletTx[key]);
    console.log('format chargerwallet cardano hardware Tx =====>>> : ', chargerwalletTx);
    return Promise.resolve(chargerwalletTx);
};
exports.txToChargerWallet = txToChargerWallet;
const bytesToIp = bytes => {
    if (!bytes)
        return null;
    if (bytes.length === 4) {
        return { ipv4: bytes.join('.') };
    }
    else if (bytes.length === 16) {
        let ipv6 = '';
        for (let i = 0; i < bytes.length; i += 2) {
            ipv6 += bytes[i].toString(16) + bytes[i + 1].toString(16) + ':';
        }
        ipv6 = ipv6.slice(0, -1);
        return { ipv6 };
    }
    return null;
};
