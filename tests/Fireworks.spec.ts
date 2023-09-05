import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Fireworks } from '../wrappers/Fireworks';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Fireworks', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Fireworks');
    });

    let blockchain: Blockchain;
    let fireworks: SandboxContract<Fireworks>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        fireworks = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                },
                code
            )
        );

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await fireworks.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: fireworks.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and fireworks are ready to use
    });

    it('should send 4 messages', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendLaunch(launcher.getSender(), { value : toNano('1') });


        expect(launchResult).toHaveTransaction({
            from: fireworks.address,
            to: launcher.address,
            outMessagesCount: 4
        })

    });
});
