import { loadMessageRelaxed, storeMessageRelaxed, Dictionary, DictionaryValue, Address, internal, MessageRelaxed, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, SenderArguments } from 'ton-core';
import Treasury from '@ton-community/sandbox';

const DictionaryMessageValue: DictionaryValue<{ sendMode: SendMode, message: MessageRelaxed }> = {
    serialize(src, builder) {
        builder.storeUint(src.sendMode, 8);
        builder.storeRef(beginCell().store(storeMessageRelaxed(src.message)));
    },
    parse(src) {
        let sendMode = src.loadUint(8);
        let message = loadMessageRelaxed(src.loadRef().beginParse());
        return { sendMode, message };
    },
}


export type FireworksConfig = {
    id: number;
    counter: number;
};

export function fireworksConfigToCell(config: FireworksConfig): Cell {
    return beginCell().storeUint(config.id, 32).storeUint(config.counter, 32).endCell();
}

export function senderArgsToMessageRelaxed(args: SenderArguments): MessageRelaxed {
    return internal({
        to: args.to,
        value: args.value,
        init: args.init,
        body: args.body,
        bounce: args.bounce
    })
}



export const Opcodes = {
    increase: 0x7e8764ef,
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

    async sendMessages(provider: ContractProvider, messages: MessageRelaxed[], sendMode?: SendMode) {
        let transfer = this.createTransfer({
            sendMode: sendMode,
            messages: messages
        })
        await provider.external(transfer)
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }




    async sendDeployLaunch(provider: ContractProvider, via: Sender, value: bigint) {



        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });

        await this.sendMessages(provider, ...)

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.launch_first, 32)
                .endCell(),
        });

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.launch_second, 32)
                .endCell(),
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

     createTransfer(args: {
        messages: MessageRelaxed[]
        sendMode?: SendMode,
    }) {
        let sendMode = SendMode.PAY_GAS_SEPARATELY;
        if (args.sendMode !== null && args.sendMode !== undefined) {
            sendMode = args.sendMode;
        }

        if (args.messages.length > 255) {
            throw new Error('Maximum number of messages is 255');
        }
        let messages = Dictionary.empty(Dictionary.Keys.Int(16), DictionaryMessageValue);
        let index = 0;
        for (let m of args.messages) {
            messages.set(index++, { sendMode, message: m });
        }

        return beginCell()
            .storeUint(0, 256)
            .storeDict(messages)
            .endCell();
    }
}
