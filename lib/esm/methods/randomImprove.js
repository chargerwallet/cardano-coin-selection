import { ERROR } from '../constants';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser';
import { bigNumFromStr, prepareChangeOutput, setMinUtxoValueForOutputs, getTxBuilder, getUserOutputQuantityWithDeposit, multiAssetToArray, buildTxInput, buildTxOutput, getUnsatisfiedAssets, splitChangeOutput, filterUtxos, getUtxoQuantity, getOutputQuantity, getRandomUtxo, orderInputs, } from '../utils/common';
import { CoinSelectionError } from '../utils/errors';
import { getLogger } from '../utils/logger';
// Heavily inspired by https://github.com/input-output-hk/cardano-js-sdk
const improvesSelection = (utxoAlreadySelected, input, minimumTarget, asset) => {
    const oldQuantity = getUtxoQuantity(utxoAlreadySelected, asset);
    // We still haven't reached the minimum target of
    // 100%. Therefore, we consider any potential input
    // to be an improvement:
    if (oldQuantity.compare(minimumTarget) < 0)
        return true;
    const newQuantity = oldQuantity.checked_add(getUtxoQuantity([input], asset));
    const idealTarget = minimumTarget.checked_mul(bigNumFromStr('2'));
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
    const preparedOutputs = setMinUtxoValueForOutputs(txBuilder, outputs, dummyAddress);
    preparedOutputs.forEach(output => {
        const txOutput = buildTxOutput(output, dummyAddress);
        txBuilder.add_output(txOutput);
    });
    // Check for UTXO_BALANCE_INSUFFICIENT comparing provided inputs with requested outputs
    const assetsRemaining = getUnsatisfiedAssets(utxoSelected, preparedOutputs);
    assetsRemaining.forEach(asset => {
        const outputQuantity = getOutputQuantity(preparedOutputs, asset);
        const utxosQuantity = getUtxoQuantity(utxos, asset);
        if (outputQuantity.compare(utxosQuantity) > 0) {
            throw new CoinSelectionError(ERROR.UTXO_BALANCE_INSUFFICIENT);
        }
    });
    while (assetsRemaining.length > 0) {
        assetsRemaining.forEach((asset, assetIndex) => {
            const assetUtxos = filterUtxos(utxoRemaining, asset);
            if (assetUtxos.length > 0) {
                const inputIdx = Math.floor(Math.random() * assetUtxos.length);
                const utxo = assetUtxos[inputIdx];
                if (improvesSelection(utxoSelected, utxo, getOutputQuantity(preparedOutputs, asset), asset)) {
                    utxoSelected.push(utxo);
                    const { input, address, amount } = buildTxInput(utxo);
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
    const totalUserOutputsAmount = getUserOutputQuantityWithDeposit(preparedOutputs, 0);
    const singleChangeOutput = prepareChangeOutput(txBuilder, utxoSelected, preparedOutputs, changeAddress, getUtxoQuantity(utxoSelected, 'lovelace'), getUserOutputQuantityWithDeposit(preparedOutputs, 0), totalFeesAmount, () => getRandomUtxo(txBuilder, utxoRemaining, utxoSelected));
    const changeOutputs = singleChangeOutput
        ? splitChangeOutput(txBuilder, singleChangeOutput, changeAddress, maxTokensPerOutput)
        : [];
    let requiredAmount = totalFeesAmount.checked_add(totalUserOutputsAmount);
    changeOutputs.forEach(changeOutput => {
        // we need to cover amounts and fees for change outputs
        requiredAmount = requiredAmount
            .checked_add(changeOutput.output.amount().coin())
            .checked_add(changeOutput.outputFee);
    });
    if (requiredAmount.compare(getUtxoQuantity(utxoSelected, 'lovelace')) > 0) {
        const randomUtxo = getRandomUtxo(txBuilder, utxoRemaining, utxoSelected);
        if (randomUtxo === null || randomUtxo === void 0 ? void 0 : randomUtxo.utxo) {
            randomUtxo.addUtxo();
            const { changeOutputs } = calculateChange(utxoSelected, utxoRemaining, preparedOutputs, changeAddress, maxTokensPerOutput, txBuilder);
            return { changeOutputs };
        }
        else {
            throw new CoinSelectionError(ERROR.UTXO_BALANCE_INSUFFICIENT);
        }
    }
    else {
        return { changeOutputs };
    }
};
export const randomImprove = (params, options) => {
    var _a;
    const { utxos, outputs, changeAddress, ttl } = params;
    const logger = getLogger(!!(options === null || options === void 0 ? void 0 : options.debug));
    if (outputs.length > utxos.length) {
        logger.debug('There are more outputs than utxos. Random-improve alg needs to have number of utxos same or larger than number of outputs');
        throw new CoinSelectionError(ERROR.UTXO_NOT_FRAGMENTED_ENOUGH);
    }
    const txBuilder = getTxBuilder((_a = options === null || options === void 0 ? void 0 : options.feeParams) === null || _a === void 0 ? void 0 : _a.a);
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
            assets: multiAssetToArray(change.output.amount().multiasset()),
        };
        finalOutputs.push(ch);
        txBuilder.add_output(buildTxOutput(ch, changeAddress));
    });
    const totalUserOutputsAmount = getUserOutputQuantityWithDeposit(preparedOutputs, 0);
    const totalInput = getUtxoQuantity(utxoSelected, 'lovelace');
    const totalOutput = getOutputQuantity(finalOutputs, 'lovelace');
    const fee = totalInput.checked_sub(totalOutput);
    const totalSpent = totalUserOutputsAmount.checked_add(fee);
    txBuilder.set_fee(fee);
    const txBody = txBuilder.build();
    const txHash = Buffer.from(CardanoWasm.hash_transaction(txBody).to_bytes()).toString('hex');
    const txBodyHex = Buffer.from(txBody.to_bytes()).toString('hex');
    // reorder inputs to match order within tx
    const orderedInputs = orderInputs(utxoSelected, txBody);
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
