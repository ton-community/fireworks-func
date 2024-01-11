import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type FireworksConfig = {
    id: number;
};

export function fireworksConfigToCell(config: FireworksConfig): Cell {
    return beginCell().storeUint(config.id, 32).endCell();
}

export const OPCODES = {
    SET_FIRST: 0x5720cfeb,
    LAUNCH_FIRST: 0x6efe144b,
    LAUNCH_SECOND: 0xa2e2c2dc,
    FAKED_LAUNCH: 0x39041457,
};

/*
0	Compute Phase	Standard successful execution exit code.
1	Compute Phase	Alternative successful execution exit code.
2	Compute Phase	Stack underflow. Last op-code consumed more elements than there are on the stacks. 1
3	Compute Phase	Stack overflow. More values have been stored on a stack than allowed by this version of TVM.
4	Compute Phase	Integer overflow. Integer does not fit into −2256 ≤ x < 2256 or a division by zero has occurred.
5	Compute Phase	Integer out of expected range.
6	Compute Phase	Invalid opcode. Instruction is unknown in the current TVM version.
7	Compute Phase	Type check error. An argument to a primitive is of an incorrect value type. 1
8	Compute Phase	Cell overflow. Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.
9	Compute Phase	Cell underflow. Read from slice primitive tried to read more bits or references than there are.
10	Compute Phase	Dictionary error. Error during manipulation with dictionary (hashmaps).
11	Compute Phase	Most oftenly caused by trying to call get-method whose id wasn't found in the code (missing method_id modifier or wrong get-method name specified when trying to call it). In TVM docs its described as "Unknown error, may be thrown by user programs".
12	Compute Phase	Thrown by TVM in situations deemed impossible.
13	Compute Phase	Out of gas error. Thrown by TVM when the remaining gas becomes negative.
-14	Compute Phase	It means out of gas error, same as 13. Negative, because it cannot be faked
32	Action Phase	Action list is invalid. Set during action phase if c5 register after execution contains unparsable object.
-32	Action Phase	(the same as prev 32) - Method ID not found. Returned by TonLib during an attempt to execute non-existent get method.
33	Action Phase	Action list is too long.
34	Action Phase	Action is invalid or not supported. Set during action phase if current action cannot be applied.
37	Action Phase	Not enough TON. Message sends too much TON (or there is not enough TON after deducting fees).
38	Action Phase	Not enough extra-currencies.
 */

export enum ExitCode {
    Success = 0,
    SuccessAlt = 1,
    StackUnderflow = 2,
    StackOverflow = 3,
    IntegerOverflow = 4,
    IntegerOutOfRange = 5,
    InvalidOpcode = 6,
    TypeCheckError = 7,
    CellOverflow = 8,
    CellUnderflow = 9,
    DictionaryError = 10,
    UnknownError = 11,
    ImpossibleError = 12,
    OutOfGasError = 13,
    OutOfGasErrorAlt = -14,
    ActionListInvalid = 32,
    ActionListTooLong = 33,
    ActionInvalid = 34,
    NotEnoughTON = 37,
    NotEnoughExtraCurrencies = 38,
}

export class Fireworks implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Fireworks(address);
    }

    static createFromConfig(config: FireworksConfig, code: Cell, workchain = 0) {
        const data = fireworksConfigToCell(config);
        const init = { code, data };
        return new Fireworks(contractAddress(workchain, init), init);
    }

    static getStateInit(config: FireworksConfig, code: Cell, workchain = 0) {
        const data = fireworksConfigToCell(config);
        const init = { code, data };
        return init;
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployLaunch(provider: ContractProvider, via: Sender, value: bigint) {
        //let init = Fireworks.getStateInit();

        if (this.init === undefined) {
            throw Error('wrong init state');
        }

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OPCODES.SET_FIRST, 32).storeRef(this.init.code).endCell(),
        });
    }

    async sendBadMessage(provider: ContractProvider, via: Sender, value: bigint, msg: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msg,
        });
    }

    async getID(provider: ContractProvider) {
        const result = await provider.get('get_id', []);
        return result.stack.readNumber();
    }

    async sendLaunch(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OPCODES.LAUNCH_FIRST, 32).endCell(),
        });
    }
}
