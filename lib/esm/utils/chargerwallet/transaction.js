import BigNumber from 'bignumber.js';
import { coinSelection } from '../../index';
import { getLogger } from '../logger';
export const composeTxPlan = (transferInfo, accountXpub, utxos, changeAddress, outputs, options) => {
    var _a;
    const logger = getLogger(!!(options === null || options === void 0 ? void 0 : options.debug));
    const transformUtxos = utxos.map(utxo => {
        var _a;
        return (Object.assign(Object.assign({}, utxo), { txHash: utxo.tx_hash, outputIndex: utxo.output_index, address: (_a = utxo.address) !== null && _a !== void 0 ? _a : transferInfo.from }));
    });
    try {
        const txPlan = coinSelection({
            utxos: transformUtxos,
            outputs: outputs,
            changeAddress,
            certificates: [],
            withdrawals: [],
            accountPubKey: accountXpub,
        }, {
            debug: (_a = options === null || options === void 0 ? void 0 : options.debug) !== null && _a !== void 0 ? _a : false,
        });
        return Promise.resolve(txPlan);
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === 'UTXO_BALANCE_INSUFFICIENT') {
            logger.debug('UTxO balance insufficient');
            if (outputs.length === 1) {
                const fixedOutput = [...outputs];
                const amountBN = new BigNumber(outputs[0].amount);
                const oneLovelace = new BigNumber('100000');
                if (amountBN.gte(oneLovelace)) {
                    fixedOutput[0].amount = amountBN.minus(oneLovelace).toFixed();
                    return composeTxPlan(transferInfo, accountXpub, utxos, changeAddress, fixedOutput);
                }
            }
            throw err;
        }
        else {
            throw err;
        }
    }
};
