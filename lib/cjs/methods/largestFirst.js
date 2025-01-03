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
exports.largestFirst = void 0;
const constants_1 = require("../constants");
const CardanoWasm = __importStar(require("@emurgo/cardano-serialization-lib-browser"));
const common_1 = require("../utils/common");
const errors_1 = require("../utils/errors");
const largestFirst = (params, options) => {
    var _a;
    const { utxos, outputs, changeAddress, certificates, withdrawals, accountPubKey, ttl, } = params;
    const txBuilder = (0, common_1.getTxBuilder)((_a = options === null || options === void 0 ? void 0 : options.feeParams) === null || _a === void 0 ? void 0 : _a.a);
    if (ttl) {
        txBuilder.set_ttl(ttl);
    }
    const usedUtxos = [];
    let sortedUtxos = (0, common_1.sortUtxos)(utxos);
    const accountKey = CardanoWasm.Bip32PublicKey.from_bytes(Buffer.from(accountPubKey, 'hex'));
    // add withdrawals and certs to correctly set a fee
    const preparedCertificates = (0, common_1.prepareCertificates)(certificates, accountKey);
    const preparedWithdrawals = (0, common_1.prepareWithdrawals)(withdrawals);
    if (preparedCertificates.len() > 0) {
        txBuilder.set_certs(preparedCertificates);
    }
    if (preparedWithdrawals.len() > 0) {
        txBuilder.set_withdrawals(preparedWithdrawals);
    }
    // TODO: negative value in case of deregistration (-2000000), but we still need enough utxos to cover fee which can't be (is that right?) paid from returned deposit
    const deposit = (0, common_1.calculateRequiredDeposit)(certificates);
    const totalWithdrawal = withdrawals.reduce((acc, withdrawal) => acc.checked_add((0, common_1.bigNumFromStr)(withdrawal.amount)), (0, common_1.bigNumFromStr)('0'));
    // calc initial fee
    let totalFeesAmount = txBuilder.min_fee();
    let utxosTotalAmount = totalWithdrawal;
    if (deposit < 0) {
        // stake deregistration, 2 ADA returned
        utxosTotalAmount = utxosTotalAmount.checked_add((0, common_1.bigNumFromStr)(Math.abs(deposit).toString()));
    }
    const preparedOutputs = (0, common_1.setMinUtxoValueForOutputs)(txBuilder, outputs, changeAddress);
    const addUtxoToSelection = (utxo) => {
        const { input, address, amount } = (0, common_1.buildTxInput)(utxo);
        const fee = txBuilder.fee_for_input(address, input, amount);
        txBuilder.add_input(address, input, amount);
        usedUtxos.push(utxo);
        totalFeesAmount = totalFeesAmount.checked_add(fee);
        utxosTotalAmount = utxosTotalAmount.checked_add((0, common_1.bigNumFromStr)((0, common_1.getAssetAmount)(utxo)));
    };
    // set initial utxos set for setMax functionality
    const maxOutputIndex = outputs.findIndex(o => !!o.setMax);
    const maxOutput = preparedOutputs[maxOutputIndex];
    const { used, remaining } = (0, common_1.getInitialUtxoSet)(sortedUtxos, maxOutput);
    sortedUtxos = remaining;
    used.forEach(utxo => addUtxoToSelection(utxo));
    // add cost of external outputs to total fee amount
    totalFeesAmount = totalFeesAmount.checked_add((0, common_1.calculateUserOutputsFee)(txBuilder, preparedOutputs, changeAddress));
    let totalUserOutputsAmount = (0, common_1.getUserOutputQuantityWithDeposit)(preparedOutputs, deposit);
    let changeOutput = null;
    let sufficientUtxos = false;
    let forceAnotherRound = false;
    while (!sufficientUtxos) {
        if (maxOutput) {
            // reset previously computed maxOutput in order to correctly calculate a potential change output
            preparedOutputs[maxOutputIndex] = (0, common_1.setMinUtxoValueForOutputs)(txBuilder, [maxOutput], changeAddress)[0];
        }
        // Calculate change output
        let singleChangeOutput = (0, common_1.prepareChangeOutput)(txBuilder, usedUtxos, preparedOutputs, changeAddress, utxosTotalAmount, (0, common_1.getUserOutputQuantityWithDeposit)(preparedOutputs, deposit), totalFeesAmount);
        if (maxOutput) {
            // set amount for a max output from a changeOutput calculated above
            const { maxOutput: newMaxOutput } = (0, common_1.setMaxOutput)(maxOutput, singleChangeOutput);
            // change output may be completely removed if all ADA are consumed by max output
            preparedOutputs[maxOutputIndex] = newMaxOutput;
            // recalculate  total user outputs amount
            totalUserOutputsAmount = (0, common_1.getUserOutputQuantityWithDeposit)(preparedOutputs, deposit);
            // recalculate fees for outputs as cost for max output may be larger than before
            totalFeesAmount = txBuilder
                .min_fee()
                .checked_add((0, common_1.calculateUserOutputsFee)(txBuilder, preparedOutputs, changeAddress));
            // recalculate change after setting amount to max output
            singleChangeOutput = (0, common_1.prepareChangeOutput)(txBuilder, usedUtxos, preparedOutputs, changeAddress, utxosTotalAmount, (0, common_1.getUserOutputQuantityWithDeposit)(preparedOutputs, deposit), totalFeesAmount);
        }
        const changeOutputs = singleChangeOutput
            ? (0, common_1.splitChangeOutput)(txBuilder, singleChangeOutput, changeAddress, options === null || options === void 0 ? void 0 : options._maxTokensPerOutput)
            : [];
        let requiredAmount = totalFeesAmount.checked_add(totalUserOutputsAmount);
        changeOutputs.forEach(changeOutput => {
            // we need to cover amounts and fees for change outputs
            requiredAmount = requiredAmount
                .checked_add(changeOutput.output.amount().coin())
                .checked_add(changeOutput.outputFee);
        });
        // List of tokens for which we don't have enough utxos
        const unsatisfiedAssets = (0, common_1.getUnsatisfiedAssets)(usedUtxos, preparedOutputs);
        if (utxosTotalAmount.compare(requiredAmount) >= 0 &&
            unsatisfiedAssets.length === 0 &&
            usedUtxos.length > 0 && // TODO: force at least 1 utxo, otherwise withdrawal tx is composed without utxo if rewards > tx cost
            !forceAnotherRound) {
            // we are done. we have enough utxos to cover fees + minUtxoValue for each output. now we can add the cost of the change output to total fees
            if (changeOutputs.length > 0) {
                changeOutputs.forEach(changeOutput => {
                    totalFeesAmount = totalFeesAmount.checked_add(changeOutput.outputFee);
                });
                // set change output
                changeOutput = changeOutputs.map(change => ({
                    isChange: true,
                    amount: change.output.amount().coin().to_str(),
                    address: changeAddress,
                    assets: (0, common_1.multiAssetToArray)(change.output.amount().multiasset()),
                }));
            }
            else {
                if (sortedUtxos.length > 0) {
                    // In current iteration we don't have enough utxo to meet min utxo value for an output,
                    // but some utxos are still available, force adding another one in order to create a change output
                    forceAnotherRound = true;
                    continue;
                }
                // Change output would be inefficient., we can burn its value + fee we would pay for it
                const unspendableChangeAmount = utxosTotalAmount.clamped_sub(totalFeesAmount.checked_add(totalUserOutputsAmount));
                totalFeesAmount = totalFeesAmount.checked_add(unspendableChangeAmount);
            }
            sufficientUtxos = true;
        }
        else {
            if (unsatisfiedAssets.length > 0) {
                // TODO: https://github.com/Emurgo/cardano-serialization-lib/pull/264
                sortedUtxos = (0, common_1.sortUtxos)(sortedUtxos, unsatisfiedAssets[0]);
            }
            else {
                sortedUtxos = (0, common_1.sortUtxos)(sortedUtxos);
            }
            const utxo = sortedUtxos.shift();
            if (!utxo)
                break;
            addUtxoToSelection(utxo);
            forceAnotherRound = false;
        }
        // END LOOP
    }
    if (!sufficientUtxos) {
        throw new errors_1.CoinSelectionError(constants_1.ERROR.UTXO_BALANCE_INSUFFICIENT);
    }
    preparedOutputs.forEach(output => {
        const txOutput = (0, common_1.buildTxOutput)(output, changeAddress);
        txBuilder.add_output(txOutput);
    });
    const finalOutputs = JSON.parse(JSON.stringify(preparedOutputs));
    if (changeOutput) {
        changeOutput.forEach(change => {
            finalOutputs.push(change);
            txBuilder.add_output((0, common_1.buildTxOutput)(change, changeAddress));
        });
    }
    txBuilder.set_fee(totalFeesAmount);
    const txBody = txBuilder.build();
    const txHash = Buffer.from(CardanoWasm.hash_transaction(txBody).to_bytes()).toString('hex');
    const txBodyHex = Buffer.from(txBody.to_bytes()).toString('hex');
    const totalSpent = totalUserOutputsAmount.checked_add(totalFeesAmount);
    // Set max property with the value of an output which has setMax=true
    let max;
    if (maxOutput) {
        max =
            maxOutput.assets.length > 0
                ? maxOutput.assets[0].quantity
                : maxOutput.amount;
    }
    // reorder inputs to match order within tx
    const orderedInputs = (0, common_1.orderInputs)(usedUtxos, txBody);
    return {
        tx: { body: txBodyHex, hash: txHash, size: txBuilder.full_size() },
        inputs: orderedInputs,
        outputs: finalOutputs,
        fee: totalFeesAmount.to_str(),
        totalSpent: totalSpent.to_str(),
        deposit: deposit.toString(),
        withdrawal: totalWithdrawal.to_str(),
        ttl,
        max,
    };
};
exports.largestFirst = largestFirst;
