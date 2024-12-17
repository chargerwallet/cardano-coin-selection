"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeTxPlan = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const index_1 = require("../../index");
const logger_1 = require("../logger");
const composeTxPlan = (transferInfo, accountXpub, utxos, changeAddress, outputs, options) => {
    var _a;
    const logger = (0, logger_1.getLogger)(!!(options === null || options === void 0 ? void 0 : options.debug));
    const transformUtxos = utxos.map(utxo => {
        var _a;
        return (Object.assign(Object.assign({}, utxo), { txHash: utxo.tx_hash, outputIndex: utxo.output_index, address: (_a = utxo.address) !== null && _a !== void 0 ? _a : transferInfo.from }));
    });
    try {
        const txPlan = (0, index_1.coinSelection)({
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
                const amountBN = new bignumber_js_1.default(outputs[0].amount);
                const oneLovelace = new bignumber_js_1.default('100000');
                if (amountBN.gte(oneLovelace)) {
                    fixedOutput[0].amount = amountBN.minus(oneLovelace).toFixed();
                    return (0, exports.composeTxPlan)(transferInfo, accountXpub, utxos, changeAddress, fixedOutput);
                }
            }
            throw err;
        }
        else {
            throw err;
        }
    }
};
exports.composeTxPlan = composeTxPlan;
