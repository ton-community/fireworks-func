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

        blockchain.verbosity = {
            ...blockchain.verbosity,
            blockchainLogs: true,
            vmLogs: 'vm_logs_full',
            debugLogs: true,
            print: true,
        }

        fireworks = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 0,
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

    it('should set first fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('1.5'));


        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            op: 0x5720cfeb //set_first
        })

    });


    it('should launch first fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('1.5'));


        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            op: 0x6efe144b //launch_first
        })

        console.log(launchResult.transactions[2]);

    });
});


