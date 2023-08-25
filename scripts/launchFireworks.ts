import { Address, toNano } from 'ton-core';
import { Fireworks } from '../wrappers/Fireworks';
import { NetworkProvider, sleep } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Fireworks address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const fireworks = provider.open(Fireworks.createFromAddress(address));

    await fireworks.sendLaunch(provider.sender(), {
        value: toNano('1'),
    });

    ui.write('Fireworks launched...');

}
