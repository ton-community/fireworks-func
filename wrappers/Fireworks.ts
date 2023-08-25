import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type FireworksConfig = {
    id: number;
    counter: number;
};

export function fireworksConfigToCell(config: FireworksConfig): Cell {
    return beginCell().storeUint(config.id, 32).storeUint(config.counter, 32).endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
    launch: 0xe3aeb7a1
};

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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendIncrease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            increaseBy: number;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.launch, 32)
                .endCell(),
        });
    }

    async getCounter(provider: ContractProvider) {
        const result = await provider.get('get_counter', []);
        return result.stack.readNumber();
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
            body: beginCell()
                .storeUint(Opcodes.launch, 32)
                .endCell(),
        });
    }
}
