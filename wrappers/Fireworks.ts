import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

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
    OutOfGasError = 13,
    OutOfGasErrorAlt = -14,
    ActionListInvalid = 32,
    ActionListTooLong = 33,
    ActionInvalid = 34,
    InvalidSrcAddr = 35,
    InvalidDstAddr = 36,
    NotEnoughTON = 37,
    NotEnoughExtraCurrencies = 38,
    NotEnoughFounds = 40,
    LibOutOfLimit = 43,
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
