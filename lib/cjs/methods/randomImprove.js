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
exports.randomImprove = void 0;
const constants_1 = require("../constants");
const CardanoWasm = __importStar(require("@emurgo/cardano-serialization-lib-browser"));
const common_1 = require("../utils/common");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
// Heavily inspired by https://github.com/input-output-hk/cardano-js-sdk
const improvesSelection = (utxoAlreadySelected, input, minimumTarget, asset) => {
    const oldQuantity = (0, common_1.getUtxoQuantity)(utxoAlreadySelected, asset);
    // We still haven't reached the minimum target of
    // 100%. Therefore, we consider any potential input
    // to be an improvement:
    if (oldQuantity.compare(minimumTarget) < 0)
        return true;
    const newQuantity = oldQuantity.checked_add((0, common_1.getUtxoQuantity)([input], asset));
    const idealTarget = minimumTarget.checked_mul((0, common_1.bigNumFromStr)('2'));
    const newDistance = idealTarget.compare(newQuantity) > 0
        ? idealTarget.clamped_sub(newQuantity)
        : newQuantity.clamped_sub(idealTarget);
    const oldDistance = idealTarget.compare(oldQuantity) > 0
        ? idealTarget.clamped_sub(oldQuantity)
        : oldQuantity.clamped_sub(idealTarget);
    // Using this input will move us closer to the
    // ideal target of 200%, so we treat this as an improvement:
    if (newDistance.compare(oldDistance) < 0)
        return true;
    // Adding the selected input would move us further
    // away from the target of 200%. Reaching this case
    // means we have already covered the minimum target
    // of 100%, and therefore it is safe to not consider
    // this token any further:
    return false;
};
const selection = (utxos, outputs, txBuilder, dummyAddress) => {
    const utxoSelected = [];
    const utxoRemaining = JSON.parse(JSON.stringify(utxos));
    const preparedOutputs = (0, common_1.setMinUtxoValueForOutputs)(txBuilder, outputs, dummyAddress);
    preparedOutputs.forEach(output => {
        const txOutput = (0, common_1.buildTxOutput)(output, dummyAddress);
        txBuilder.add_output(txOutput);
    });
    // Check for UTXO_BALANCE_INSUFFICIENT comparing provided inputs with requested outputs
    const assetsRemaining = (0, common_1.getUnsatisfiedAssets)(utxoSelected, preparedOutputs);
    assetsRemaining.forEach(asset => {
        const outputQuantity = (0, common_1.getOutputQuantity)(preparedOutputs, asset);
        const utxosQuantity = (0, common_1.getUtxoQuantity)(utxos, asset);
        if (outputQuantity.compare(utxosQuantity) > 0) {
            throw new errors_1.CoinSelectionError(constants_1.ERROR.UTXO_BALANCE_INSUFFICIENT);
        }
    });
    while (assetsRemaining.length > 0) {
        assetsRemaining.forEach((asset, assetIndex) => {
            const assetUtxos = (0, common_1.filterUtxos)(utxoRemaining, asset);
            if (assetUtxos.length > 0) {
                const inputIdx = Math.floor(Math.random() * assetUtxos.length);
                const utxo = assetUtxos[inputIdx];
                if (improvesSelection(utxoSelected, utxo, (0, common_1.getOutputQuantity)(preparedOutputs, asset), asset)) {
                    utxoSelected.push(utxo);
                    const { input, address, amount } = (0, common_1.buildTxInput)(utxo);
                    txBuilder.add_input(address, input, amount);
                    utxoRemaining.splice(utxoRemaining.indexOf(utxo), 1);
                }
                else {
                    // The selection was not improved by including
                    // this input. If we've reached this point, it
                    // means that we've already covered the minimum
                    // target of 100%, and therefore it is safe to
                    // not consider this token any further.
                    assetsRemaining.splice(assetIndex, 1);
                }
            }
            else {
                // The attempt to select an input failed (there were
                // no inputs remaining that contained the token).
                // This means that we've already covered the minimum
                // quantity required (due to the pre-condition), and
                // therefore it is safe to not consider this token
                // any further:
                assetsRemaining.splice(assetIndex, 1);
            }
        });
    }
    return { utxoSelected, utxoRemaining, preparedOutputs };
};
const calculateChange = (utxoSelected, utxoRemaining, preparedOutputs, changeAddress, maxTokensPerOutput, txBuilder) => {
    const totalFeesAmount = txBuilder.min_fee();
    const totalUserOutputsAmount = (0, common_1.getUserOutputQuantityWithDeposit)(preparedOutputs, 0);
    const singleChangeOutput = (0, common_1.prepareChangeOutput)(txBuilder, utxoSelected, preparedOutputs, changeAddress, (0, common_1.getUtxoQuantity)(utxoSelected, 'lovelace'), (0, common_1.getUserOutputQuantityWithDeposit)(preparedOutputs, 0), totalFeesAmount, () => (0, common_1.getRandomUtxo)(txBuilder, utxoRemaining, utxoSelected));
    const changeOutputs = singleChangeOutput
        ? (0, common_1.splitChangeOutput)(txBuilder, singleChangeOutput, changeAddress, maxTokensPerOutput)
        : [];
    let requiredAmount = totalFeesAmount.checked_add(totalUserOutputsAmount);
    changeOutputs.forEach(changeOutput => {
        // we need to cover amounts and fees for change outputs
        requiredAmount = requiredAmount
            .checked_add(changeOutput.output.amount().coin())
            .checked_add(changeOutput.outputFee);
    });
    if (requiredAmount.compare((0, common_1.getUtxoQuantity)(utxoSelected, 'lovelace')) > 0) {
        const randomUtxo = (0, common_1.getRandomUtxo)(txBuilder, utxoRemaining, utxoSelected);
        if (randomUtxo === null || randomUtxo === void 0 ? void 0 : randomUtxo.utxo) {
            randomUtxo.addUtxo();
            const { changeOutputs } = calculateChange(utxoSelected, utxoRemaining, preparedOutputs, changeAddress, maxTokensPerOutput, txBuilder);
            return { changeOutputs };
        }
        else {
            throw new errors_1.CoinSelectionError(constants_1.ERROR.UTXO_BALANCE_INSUFFICIENT);
        }
    }
    else {
        return { changeOutputs };
    }
};
const randomImprove = (params, options) => {
    var _a;
    const { utxos, outputs, changeAddress, ttl } = params;
    const logger = (0, logger_1.getLogger)(!!(options === null || options === void 0 ? void 0 : options.debug));
    if (outputs.length > utxos.length) {
        logger.debug('There are more outputs than utxos. Random-improve alg needs to have number of utxos same or larger than number of outputs');
        throw new errors_1.CoinSelectionError(constants_1.ERROR.UTXO_NOT_FRAGMENTED_ENOUGH);
    }
    const txBuilder = (0, common_1.getTxBuilder)((_a = options === null || options === void 0 ? void 0 : options.feeParams) === null || _a === void 0 ? void 0 : _a.a);
    if (ttl) {
        txBuilder.set_ttl(ttl);
    }
    const { utxoSelected, utxoRemaining, preparedOutputs } = selection(utxos, outputs, txBuilder, changeAddress);
    // compute change and adjust for fee
    const { changeOutputs } = calculateChange(utxoSelected, utxoRemaining, preparedOutputs, changeAddress, options === null || options === void 0 ? void 0 : options._maxTokensPerOutput, txBuilder);
    const finalOutputs = JSON.parse(JSON.stringify(preparedOutputs));
    changeOutputs.forEach(change => {
        const ch = {
            isChange: true,
            amount: change.output.amount().coin().to_str(),
            address: changeAddress,
            assets: (0, common_1.multiAssetToArray)(change.output.amount().multiasset()),
        };
        finalOutputs.push(ch);
        txBuilder.add_output((0, common_1.buildTxOutput)(ch, changeAddress));
    });
    const totalUserOutputsAmount = (0, common_1.getUserOutputQuantityWithDeposit)(preparedOutputs, 0);
    const totalInput = (0, common_1.getUtxoQuantity)(utxoSelected, 'lovelace');
    const totalOutput = (0, common_1.getOutputQuantity)(finalOutputs, 'lovelace');
    const fee = totalInput.checked_sub(totalOutput);
    const totalSpent = totalUserOutputsAmount.checked_add(fee);
    txBuilder.set_fee(fee);
    const txBody = txBuilder.build();
    const txHash = Buffer.from(CardanoWasm.hash_transaction(txBody).to_bytes()).toString('hex');
    const txBodyHex = Buffer.from(txBody.to_bytes()).toString('hex');
    // reorder inputs to match order within tx
    const orderedInputs = (0, common_1.orderInputs)(utxoSelected, txBody);
    return {
        tx: { body: txBodyHex, hash: txHash, size: txBuilder.full_size() },
        inputs: orderedInputs,
        outputs: finalOutputs,
        fee: fee.to_str(),
        totalSpent: totalSpent.to_str(),
        deposit: '0',
        withdrawal: '0',
        ttl,
    };
};
exports.randomImprove = randomImprove;
