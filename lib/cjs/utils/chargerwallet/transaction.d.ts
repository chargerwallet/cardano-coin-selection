import { PrecomposedTransaction } from '../../types/types';
import { ITransferInfo, IAdaUTXO, IOutput } from './types';
export declare const composeTxPlan: (transferInfo: ITransferInfo, accountXpub: string, utxos: IAdaUTXO[], changeAddress: string, outputs: IOutput[], options?: {
    debug: boolean;
}) => Promise<PrecomposedTransaction>;
