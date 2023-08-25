import { toNano } from 'ton-core';
import { Fireworks } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const fireworks = provider.open(
        Fireworks.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('Fireworks')
        )
    );

    await fireworks.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(fireworks.address);
}
