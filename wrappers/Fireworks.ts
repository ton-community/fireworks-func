import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type FireworksConfig = {
    id: number;
};

export function fireworksConfigToCell(config: FireworksConfig): Cell {
    return beginCell().storeUint(config.id, 32).endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
    set_first: 0x5720cfeb,
    launch_first: 0x6efe144b,
    launch_second: 0xa2e2c2dc
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
            body: beginCell()
                .storeUint(Opcodes.set_first, 32)
                .storeRef((this.init.code))
                .endCell()
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
            body: beginCell()
                .storeUint(Opcodes.launch_first, 32)
                .endCell(),
        });
    }
}
