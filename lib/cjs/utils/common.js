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
exports.orderInputs = exports.calculateUserOutputsFee = exports.getRandomUtxo = exports.filterUtxos = exports.getUserOutputQuantityWithDeposit = exports.setMaxOutput = exports.getInitialUtxoSet = exports.getUnsatisfiedAssets = exports.getTxBuilder = exports.prepareChangeOutput = exports.splitChangeOutput = exports.setMinUtxoValueForOutputs = exports.calculateRequiredDeposit = exports.prepareCertificates = exports.prepareWithdrawals = exports.getOutputCost = exports.buildTxOutput = exports.buildTxInput = exports.sortUtxos = exports.getOutputQuantity = exports.getUtxoQuantity = exports.getAssetAmount = exports.multiAssetToArray = exports.buildMultiAsset = exports.parseAsset = exports.getNetworkId = exports.getProtocolMagic = exports.bigNumFromStr = void 0;
const CardanoWasm = __importStar(require("@emurgo/cardano-serialization-lib-browser"));
const constants_1 = require("../constants");
const errors_1 = require("./errors");
const bigNumFromStr = (num) => CardanoWasm.BigNum.from_str(num);
exports.bigNumFromStr = bigNumFromStr;
const getProtocolMagic = (tesnet) => tesnet
    ? constants_1.CARDANO_PARAMS.PROTOCOL_MAGICS.testnet
    : constants_1.CARDANO_PARAMS.PROTOCOL_MAGICS.mainnet;
exports.getProtocolMagic = getProtocolMagic;
const getNetworkId = (testnet) => testnet
    ? constants_1.CARDANO_PARAMS.NETWORK_IDS.testnet
    : constants_1.CARDANO_PARAMS.NETWORK_IDS.mainnet;
exports.getNetworkId = getNetworkId;
const parseAsset = (hex) => {
    const policyIdSize = 56;
    const policyId = hex.slice(0, policyIdSize);
    const assetNameInHex = hex.slice(policyIdSize);
    return {
        policyId,
        assetNameInHex,
    };
};
exports.parseAsset = parseAsset;
const buildMultiAsset = (assets) => {
    const multiAsset = CardanoWasm.MultiAsset.new();
    const assetsGroupedByPolicy = {};
    assets.forEach(assetEntry => {
        const { policyId, assetNameInHex } = (0, exports.parseAsset)(assetEntry.unit);
        if (!assetsGroupedByPolicy[policyId]) {
            assetsGroupedByPolicy[policyId] = CardanoWasm.Assets.new();
        }
        const assets = assetsGroupedByPolicy[policyId];
        assets.insert(CardanoWasm.AssetName.new(Buffer.from(assetNameInHex, 'hex')), (0, exports.bigNumFromStr)(assetEntry.quantity || '0'));
    });
    Object.keys(assetsGroupedByPolicy).forEach(policyId => {
        const scriptHash = CardanoWasm.ScriptHash.from_bytes(Buffer.from(policyId, 'hex'));
        multiAsset.insert(scriptHash, assetsGroupedByPolicy[policyId]);
    });
    return multiAsset;
};
exports.buildMultiAsset = buildMultiAsset;
const multiAssetToArray = (multiAsset) => {
    if (!multiAsset)
        return [];
    const assetsArray = [];
    const policyHashes = multiAsset.keys();
    for (let i = 0; i < policyHashes.len(); i++) {
        const policyId = policyHashes.get(i);
        const assetsInPolicy = multiAsset.get(policyId);
        if (!assetsInPolicy)
            continue;
        const assetNames = assetsInPolicy.keys();
        for (let j = 0; j < assetNames.len(); j++) {
            const assetName = assetNames.get(j);
            const amount = assetsInPolicy.get(assetName);
            if (!amount)
                continue;
            const policyIdHex = Buffer.from(policyId.to_bytes()).toString('hex');
            const assetNameHex = Buffer.from(assetName.name()).toString('hex');
            assetsArray.push({
                quantity: amount.to_str(),
                unit: `${policyIdHex}${assetNameHex}`,
            });
        }
    }
    return assetsArray;
};
exports.multiAssetToArray = multiAssetToArray;
const getAssetAmount = (obj, asset = 'lovelace') => { var _a, _b; return (_b = (_a = obj.amount.find(a => a.unit === asset)) === null || _a === void 0 ? void 0 : _a.quantity) !== null && _b !== void 0 ? _b : '0'; };
exports.getAssetAmount = getAssetAmount;
const getUtxoQuantity = (utxos, asset = 'lovelace') => utxos.reduce((acc, utxo) => acc.checked_add((0, exports.bigNumFromStr)((0, exports.getAssetAmount)(utxo, asset))), (0, exports.bigNumFromStr)('0'));
exports.getUtxoQuantity = getUtxoQuantity;
const getOutputQuantity = (outputs, asset = 'lovelace') => {
    if (asset === 'lovelace') {
        return outputs.reduce((acc, output) => { var _a; return acc.checked_add((0, exports.bigNumFromStr)((_a = output.amount) !== null && _a !== void 0 ? _a : '0')); }, (0, exports.bigNumFromStr)('0'));
    }
    return outputs.reduce((acc, output) => {
        var _a, _b, _c;
        return acc.checked_add((0, exports.bigNumFromStr)((_c = (_b = (_a = output.assets) === null || _a === void 0 ? void 0 : _a.find(a => a.unit === asset)) === null || _b === void 0 ? void 0 : _b.quantity) !== null && _c !== void 0 ? _c : '0'));
    }, (0, exports.bigNumFromStr)('0'));
};
exports.getOutputQuantity = getOutputQuantity;
const sortUtxos = (utxos, asset = 'lovelace') => {
    const copy = JSON.parse(JSON.stringify(utxos));
    return copy.sort((u1, u2) => (0, exports.bigNumFromStr)((0, exports.getAssetAmount)(u2, asset)).compare((0, exports.bigNumFromStr)((0, exports.getAssetAmount)(u1, asset))));
};
exports.sortUtxos = sortUtxos;
const buildTxInput = (utxo) => {
    const input = CardanoWasm.TransactionInput.new(CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.txHash, 'hex')), utxo.outputIndex);
    const amount = CardanoWasm.Value.new((0, exports.bigNumFromStr)((0, exports.getAssetAmount)(utxo)));
    const assets = utxo.amount.filter(a => a.unit !== 'lovelace');
    if (assets.length > 0) {
        const multiAsset = (0, exports.buildMultiAsset)(assets);
        amount.set_multiasset(multiAsset);
    }
    const address = CardanoWasm.Address.from_bech32(utxo.address);
    return { input, address, amount };
};
exports.buildTxInput = buildTxInput;
const buildTxOutput = (output, dummyAddress) => {
    var _a;
    // If output.address was not defined fallback to bech32 address (useful for "precompose" tx
    // which doesn't have all necessary data, but we can fill in the blanks and return some info such as fee)
    const outputAddr = output.address && CardanoWasm.ByronAddress.is_valid(output.address)
        ? CardanoWasm.ByronAddress.from_base58(output.address).to_address()
        : CardanoWasm.Address.from_bech32((_a = output.address) !== null && _a !== void 0 ? _a : dummyAddress);
    // Set initial amount
    const outputAmount = output.amount
        ? (0, exports.bigNumFromStr)(output.amount)
        : (0, exports.bigNumFromStr)('0');
    // Create Value including assets
    let outputValue = CardanoWasm.Value.new(outputAmount);
    const multiAsset = output.assets.length > 0 ? (0, exports.buildMultiAsset)(output.assets) : null;
    if (multiAsset) {
        outputValue.set_multiasset(multiAsset);
    }
    // Calculate min required ADA for the output
    let txOutput = CardanoWasm.TransactionOutput.new(outputAddr, outputValue);
    const minAdaRequired = CardanoWasm.min_ada_for_output(txOutput, constants_1.DATA_COST_PER_UTXO_BYTE);
    // If calculated min required ada is greater than current output value than adjust it
    if (outputAmount.compare(minAdaRequired) < 0) {
        outputValue = CardanoWasm.Value.new(minAdaRequired);
        if (multiAsset) {
            outputValue.set_multiasset(multiAsset);
        }
        txOutput = CardanoWasm.TransactionOutput.new(outputAddr, outputValue);
    }
    return txOutput;
};
exports.buildTxOutput = buildTxOutput;
const getOutputCost = (txBuilder, output, dummyAddress) => {
    const txOutput = (0, exports.buildTxOutput)(output, dummyAddress);
    const outputFee = txBuilder.fee_for_output(txOutput);
    const minAda = CardanoWasm.min_ada_for_output(txOutput, constants_1.DATA_COST_PER_UTXO_BYTE);
    return {
        output: txOutput,
        outputFee,
        minOutputAmount: minAda, // should match https://cardano-ledger.readthedocs.io/en/latest/explanations/min-utxo.html
    };
};
exports.getOutputCost = getOutputCost;
const prepareWithdrawals = (withdrawals) => {
    const preparedWithdrawals = CardanoWasm.Withdrawals.new();
    withdrawals.forEach(withdrawal => {
        const rewardAddress = CardanoWasm.RewardAddress.from_address(CardanoWasm.Address.from_bech32(withdrawal.stakeAddress));
        if (rewardAddress) {
            preparedWithdrawals.insert(rewardAddress, (0, exports.bigNumFromStr)(withdrawal.amount));
        }
    });
    return preparedWithdrawals;
};
exports.prepareWithdrawals = prepareWithdrawals;
const prepareCertificates = (certificates, accountKey) => {
    const preparedCertificates = CardanoWasm.Certificates.new();
    if (certificates.length === 0)
        return preparedCertificates;
    const stakeKey = accountKey.derive(2).derive(0);
    const stakeCred = CardanoWasm.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash());
    certificates.forEach(cert => {
        if (cert.type === constants_1.CertificateType.STAKE_REGISTRATION) {
            preparedCertificates.add(CardanoWasm.Certificate.new_stake_registration(CardanoWasm.StakeRegistration.new(stakeCred)));
        }
        else if (cert.type === constants_1.CertificateType.STAKE_DELEGATION) {
            preparedCertificates.add(CardanoWasm.Certificate.new_stake_delegation(CardanoWasm.StakeDelegation.new(stakeCred, CardanoWasm.Ed25519KeyHash.from_bytes(Buffer.from(cert.pool, 'hex')))));
        }
        else if (cert.type === constants_1.CertificateType.STAKE_DEREGISTRATION) {
            preparedCertificates.add(CardanoWasm.Certificate.new_stake_deregistration(CardanoWasm.StakeDeregistration.new(stakeCred)));
        }
        else {
            throw new errors_1.CoinSelectionError(constants_1.ERROR.UNSUPPORTED_CERTIFICATE_TYPE);
        }
    });
    return preparedCertificates;
};
exports.prepareCertificates = prepareCertificates;
const calculateRequiredDeposit = (certificates) => {
    const CertificateDeposit = {
        [constants_1.CertificateType.STAKE_DELEGATION]: 0,
        [constants_1.CertificateType.STAKE_POOL_REGISTRATION]: 500000000,
        [constants_1.CertificateType.STAKE_REGISTRATION]: 2000000,
        [constants_1.CertificateType.STAKE_DEREGISTRATION]: -2000000,
    };
    return certificates.reduce((acc, cert) => (acc += CertificateDeposit[cert.type]), 0);
};
exports.calculateRequiredDeposit = calculateRequiredDeposit;
const setMinUtxoValueForOutputs = (txBuilder, outputs, dummyAddress) => {
    const preparedOutputs = outputs.map(output => {
        // sets minimal output ADA amount in case of multi-asset output
        const { minOutputAmount } = (0, exports.getOutputCost)(txBuilder, output, dummyAddress);
        const outputAmount = (0, exports.bigNumFromStr)(output.amount || '0');
        let amount;
        if (output.assets.length > 0 && outputAmount.compare(minOutputAmount) < 0) {
            // output with an asset(s) adjust minimum ADA to met network requirements
            amount = minOutputAmount.to_str();
        }
        else {
            amount = output.amount;
        }
        if (!output.setMax &&
            output.assets.length === 0 &&
            output.amount &&
            outputAmount.compare(minOutputAmount) < 0) {
            // Case of an output without any asset, and without setMax = true
            // If the user entered less than min utxo val then throw an error (won't throw if there is no amount yet)
            // (On outputs with setMax flag we set '0' on purpose)
            // (On outputs with an asset we automatically adjust ADA amount if it is below required minimum)
            throw new errors_1.CoinSelectionError(constants_1.ERROR.UTXO_VALUE_TOO_SMALL);
        }
        if (output.setMax) {
            // if setMax is active set initial value to 0
            if (output.assets.length > 0) {
                output.assets[0].quantity = '0';
            }
            else {
                amount = '0';
            }
        }
        return Object.assign(Object.assign({}, output), { 
            // if output contains assets make sure that minUtxoValue is at least minOutputAmount (even for output where we want to setMax)
            amount });
    });
    return preparedOutputs;
};
exports.setMinUtxoValueForOutputs = setMinUtxoValueForOutputs;
const splitChangeOutput = (txBuilder, singleChangeOutput, changeAddress, maxTokensPerOutput = constants_1.MAX_TOKENS_PER_OUTPUT) => {
    // TODO: https://github.com/Emurgo/cardano-serialization-lib/pull/236
    const multiAsset = singleChangeOutput.output.amount().multiasset();
    if (!multiAsset || (multiAsset && multiAsset.len() < maxTokensPerOutput)) {
        return [singleChangeOutput];
    }
    let lovelaceAvailable = singleChangeOutput.output
        .amount()
        .coin()
        .checked_add(singleChangeOutput.outputFee);
    const allAssets = (0, exports.multiAssetToArray)(singleChangeOutput.output.amount().multiasset());
    const nAssetBundles = Math.ceil(allAssets.length / maxTokensPerOutput);
    const changeOutputs = [];
    // split change output to multiple outputs, where each bundle has maximum of maxTokensPerOutput assets
    for (let i = 0; i < nAssetBundles; i++) {
        const assetsBundle = allAssets.slice(i * maxTokensPerOutput, (i + 1) * maxTokensPerOutput);
        const outputValue = CardanoWasm.Value.new_from_assets((0, exports.buildMultiAsset)(assetsBundle));
        const txOutput = CardanoWasm.TransactionOutput.new(CardanoWasm.Address.from_bech32(changeAddress), outputValue);
        const minAdaRequired = CardanoWasm.min_ada_for_output(txOutput, constants_1.DATA_COST_PER_UTXO_BYTE);
        changeOutputs.push({
            isChange: true,
            address: changeAddress,
            amount: minAdaRequired.to_str(),
            assets: assetsBundle,
        });
    }
    const changeOutputsCost = changeOutputs.map((partialChange, i) => {
        let changeOutputCost = (0, exports.getOutputCost)(txBuilder, partialChange, changeAddress);
        lovelaceAvailable = lovelaceAvailable.clamped_sub((0, exports.bigNumFromStr)(partialChange.amount).checked_add(changeOutputCost.outputFee));
        if (i === changeOutputs.length - 1) {
            // add all unused ADA to the last change output
            let changeOutputAmount = lovelaceAvailable.checked_add((0, exports.bigNumFromStr)(partialChange.amount));
            if (changeOutputAmount.compare(changeOutputCost.minOutputAmount) < 0) {
                // computed change amount would be below minUtxoValue
                // set change output amount to met minimum requirements for minUtxoValue
                changeOutputAmount = changeOutputCost.minOutputAmount;
            }
            partialChange.amount = changeOutputAmount.to_str();
            changeOutputCost = (0, exports.getOutputCost)(txBuilder, partialChange, changeAddress);
        }
        return changeOutputCost;
    });
    return changeOutputsCost;
};
exports.splitChangeOutput = splitChangeOutput;
const prepareChangeOutput = (txBuilder, usedUtxos, preparedOutputs, changeAddress, utxosTotalAmount, totalOutputAmount, totalFeesAmount, pickAdditionalUtxo) => {
    // change output amount should be lowered by the cost of the change output (fee + minUtxoVal)
    // The cost will be subtracted once we calculate it.
    const placeholderChangeOutputAmount = utxosTotalAmount.clamped_sub(totalFeesAmount.checked_add(totalOutputAmount));
    const uniqueAssets = [];
    usedUtxos.forEach(utxo => {
        const assets = utxo.amount.filter(a => a.unit !== 'lovelace');
        assets.forEach(asset => {
            if (!uniqueAssets.includes(asset.unit)) {
                uniqueAssets.push(asset.unit);
            }
        });
    });
    const changeOutputAssets = uniqueAssets
        .map(assetUnit => {
        const assetInputAmount = (0, exports.getUtxoQuantity)(usedUtxos, assetUnit);
        const assetSpentAmount = (0, exports.getOutputQuantity)(preparedOutputs, assetUnit);
        return {
            unit: assetUnit,
            quantity: assetInputAmount.clamped_sub(assetSpentAmount).to_str(),
        };
    })
        .filter(asset => asset.quantity !== '0');
    const changeOutputCost = (0, exports.getOutputCost)(txBuilder, {
        address: changeAddress,
        amount: placeholderChangeOutputAmount.to_str(),
        assets: changeOutputAssets,
    }, changeAddress);
    // calculate change output amount as utxosTotalAmount - totalOutputAmount - totalFeesAmount - change output fee
    const totalSpent = totalOutputAmount
        .checked_add(totalFeesAmount)
        .checked_add(changeOutputCost.outputFee);
    let changeOutputAmount = utxosTotalAmount.clamped_sub(totalSpent);
    // Sum of all tokens in utxos must be same as sum of the tokens in external + change outputs
    // If computed change output doesn't contain any tokens then it makes sense to add it only if the fee + minUtxoValue is less then the amount
    let isChangeOutputNeeded = false;
    if (changeOutputAssets.length > 0 ||
        changeOutputAmount.compare(changeOutputCost.minOutputAmount) >= 0) {
        isChangeOutputNeeded = true;
    }
    else if (pickAdditionalUtxo &&
        changeOutputAmount.compare((0, exports.bigNumFromStr)('5000')) >= 0) {
        // change amount is above our constant (0.005 ADA), but still less than required minUtxoValue
        // try to add another utxo recalculate change again
        const utxo = pickAdditionalUtxo();
        if (utxo) {
            utxo.addUtxo();
            const newTotalFee = txBuilder.min_fee();
            return (0, exports.prepareChangeOutput)(txBuilder, usedUtxos, preparedOutputs, changeAddress, (0, exports.getUtxoQuantity)(usedUtxos, 'lovelace'), totalOutputAmount, newTotalFee, pickAdditionalUtxo);
        }
    }
    if (isChangeOutputNeeded) {
        if (changeOutputAmount.compare(changeOutputCost.minOutputAmount) < 0) {
            // computed change amount would be below minUtxoValue
            // set change output amount to met minimum requirements for minUtxoValue
            changeOutputAmount = changeOutputCost.minOutputAmount;
        }
        // TODO: changeOutputCost.output.amount().set_coin(changeOutputAmount)?
        const txOutput = (0, exports.buildTxOutput)({
            amount: changeOutputAmount.to_str(),
            address: changeAddress,
            assets: changeOutputAssets,
        }, changeAddress);
        // WARNING: It returns a change output also in a case where we don't have enough utxos to cover the output cost, but the change output is needed because it contains additional assets
        return {
            outputFee: changeOutputCost.outputFee,
            minOutputAmount: changeOutputCost.minOutputAmount,
            output: txOutput,
        };
    }
    // Change output not needed
    return null;
};
exports.prepareChangeOutput = prepareChangeOutput;
const getTxBuilder = (a = '44') => CardanoWasm.TransactionBuilder.new(CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(CardanoWasm.LinearFee.new((0, exports.bigNumFromStr)(a), (0, exports.bigNumFromStr)('155381')))
    .pool_deposit((0, exports.bigNumFromStr)('500000000'))
    .key_deposit((0, exports.bigNumFromStr)('2000000'))
    .coins_per_utxo_byte((0, exports.bigNumFromStr)(constants_1.CARDANO_PARAMS.COINS_PER_UTXO_BYTE))
    .max_value_size(constants_1.CARDANO_PARAMS.MAX_VALUE_SIZE)
    .max_tx_size(constants_1.CARDANO_PARAMS.MAX_TX_SIZE)
    .build());
exports.getTxBuilder = getTxBuilder;
const getUnsatisfiedAssets = (selectedUtxos, outputs) => {
    const assets = [];
    outputs.forEach(output => {
        if (output.assets.length > 0) {
            const asset = output.assets[0];
            const assetAmountInUtxos = (0, exports.getUtxoQuantity)(selectedUtxos, asset.unit);
            if (assetAmountInUtxos.compare((0, exports.bigNumFromStr)(asset.quantity)) < 0) {
                assets.push(asset.unit);
            }
        }
    });
    const lovelaceUtxo = (0, exports.getUtxoQuantity)(selectedUtxos, 'lovelace');
    if (lovelaceUtxo.compare((0, exports.getOutputQuantity)(outputs, 'lovelace')) < 0) {
        assets.push('lovelace');
    }
    return assets;
};
exports.getUnsatisfiedAssets = getUnsatisfiedAssets;
const getInitialUtxoSet = (utxos, maxOutput) => {
    var _a, _b;
    // Picks all utxos containing an asset on which the user requested to set maximum value
    if (!maxOutput)
        return {
            used: [],
            remaining: utxos,
        };
    const used = [];
    const remaining = [];
    const maxOutputAsset = (_b = (_a = maxOutput.assets[0]) === null || _a === void 0 ? void 0 : _a.unit) !== null && _b !== void 0 ? _b : 'lovelace';
    // either all UTXOs will be used (send max for ADA output) or initial set of used utxos will contain all utxos containing given token
    utxos.forEach(u => {
        if (u.amount.find(a => a.unit === maxOutputAsset)) {
            used.push(u);
        }
        else {
            remaining.push(u);
        }
    });
    return {
        used,
        remaining,
    };
};
exports.getInitialUtxoSet = getInitialUtxoSet;
const setMaxOutput = (maxOutput, changeOutput) => {
    var _a, _b, _c, _d;
    const maxOutputAsset = (_b = (_a = maxOutput.assets[0]) === null || _a === void 0 ? void 0 : _a.unit) !== null && _b !== void 0 ? _b : 'lovelace';
    let newMaxAmount = (0, exports.bigNumFromStr)('0');
    const changeOutputAssets = (0, exports.multiAssetToArray)(changeOutput === null || changeOutput === void 0 ? void 0 : changeOutput.output.amount().multiasset());
    if (maxOutputAsset === 'lovelace') {
        // set maxOutput for ADA
        if (changeOutput) {
            newMaxAmount = changeOutput.output.amount().coin();
            if (changeOutputAssets.length === 0) {
                // we don't need the change output anymore
                newMaxAmount = newMaxAmount.checked_add(changeOutput.outputFee);
                changeOutput = null;
            }
            else {
                newMaxAmount = newMaxAmount.clamped_sub(changeOutput.minOutputAmount);
                const txOutput = CardanoWasm.TransactionOutput.new(changeOutput.output.address(), CardanoWasm.Value.new(newMaxAmount));
                const minUtxoVal = CardanoWasm.min_ada_for_output(txOutput, constants_1.DATA_COST_PER_UTXO_BYTE);
                if (newMaxAmount.compare(minUtxoVal) < 0) {
                    // the amount would be less than min required ADA
                    throw new errors_1.CoinSelectionError(constants_1.ERROR.UTXO_BALANCE_INSUFFICIENT);
                }
            }
        }
        maxOutput.amount = newMaxAmount.to_str();
    }
    else {
        // set maxOutput for token
        if (changeOutput) {
            // max amount of the asset in output is equal to its quantity in change output
            newMaxAmount = (0, exports.bigNumFromStr)((_d = (_c = changeOutputAssets.find(a => a.unit === maxOutputAsset)) === null || _c === void 0 ? void 0 : _c.quantity) !== null && _d !== void 0 ? _d : '0');
            maxOutput.assets[0].quantity = newMaxAmount.to_str(); // TODO: set 0 if no change?
            const txOutput = CardanoWasm.TransactionOutput.new(changeOutput.output.address(), 
            // new_from_assets does not automatically include required ADA
            CardanoWasm.Value.new_from_assets((0, exports.buildMultiAsset)(maxOutput.assets)));
            // adjust ADA amount to cover min ada for the asset
            maxOutput.amount = CardanoWasm.min_ada_for_output(txOutput, constants_1.DATA_COST_PER_UTXO_BYTE).to_str();
        }
    }
    return { maxOutput };
};
exports.setMaxOutput = setMaxOutput;
const getUserOutputQuantityWithDeposit = (outputs, deposit, asset = 'lovelace') => {
    let amount = (0, exports.getOutputQuantity)(outputs, asset);
    if (deposit > 0) {
        amount = amount.checked_add((0, exports.bigNumFromStr)(deposit.toString()));
    }
    return amount;
};
exports.getUserOutputQuantityWithDeposit = getUserOutputQuantityWithDeposit;
const filterUtxos = (utxos, asset) => {
    return utxos.filter(utxo => utxo.amount.find(a => a.unit === asset));
};
exports.filterUtxos = filterUtxos;
const getRandomUtxo = (txBuilder, utxoRemaining, utxoSelected) => {
    const index = Math.floor(Math.random() * utxoRemaining.length);
    const utxo = utxoRemaining[index];
    if (!utxo)
        return null;
    return {
        utxo,
        addUtxo: () => {
            utxoSelected.push(utxo);
            const { input, address, amount } = (0, exports.buildTxInput)(utxo);
            txBuilder.add_input(address, input, amount);
            utxoRemaining.splice(utxoRemaining.indexOf(utxo), 1);
        },
    };
};
exports.getRandomUtxo = getRandomUtxo;
const calculateUserOutputsFee = (txBuilder, userOutputs, changeAddress) => {
    // Calculate fee and minUtxoValue for all external outputs
    const outputsCost = userOutputs.map(output => (0, exports.getOutputCost)(txBuilder, output, changeAddress));
    const totalOutputsFee = outputsCost.reduce((acc, output) => (acc = acc.checked_add(output.outputFee)), (0, exports.bigNumFromStr)('0'));
    return totalOutputsFee;
};
exports.calculateUserOutputsFee = calculateUserOutputsFee;
const orderInputs = (inputsToOrder, txBody) => {
    // reorder inputs to match order within tx
    const orderedInputs = [];
    for (let i = 0; i < txBody.inputs().len(); i++) {
        const txid = Buffer.from(txBody.inputs().get(i).transaction_id().to_bytes()).toString('hex');
        const outputIndex = txBody.inputs().get(i).index();
        const utxo = inputsToOrder.find(uu => uu.txHash === txid && uu.outputIndex === outputIndex);
        if (!utxo) {
            throw new Error('Failed to order the utxos to match the order of inputs in constructed tx. THIS SHOULD NOT HAPPEN');
        }
        orderedInputs.push(utxo);
    }
    return orderedInputs;
};
exports.orderInputs = orderInputs;
