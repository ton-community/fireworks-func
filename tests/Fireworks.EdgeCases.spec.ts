import {Blockchain, printTransactionFees, SandboxContract} from '@ton-community/sandbox';
import { Cell, toNano, beginCell, Address } from 'ton-core';
import {Fireworks, Opcodes} from '../wrappers/Fireworks';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';


describe('Edge Cases Tests', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Fireworks');
    });

    let blockchain: Blockchain;
    let fireworks: SandboxContract<Fireworks>;
    let launched_f1: SandboxContract<Fireworks>;
    let launched_f2: SandboxContract<Fireworks>;


    beforeEach(async () => {
        blockchain = await Blockchain.create();

        blockchain.verbosity = {
            ...blockchain.verbosity,
            blockchainLogs: true,
            vmLogs: 'vm_logs_full',
            debugLogs: true,
            print: false,
        }

        fireworks = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 0,
                },
                code
            )
        );

        launched_f1 = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 1,
                },
                code
            )
        );

        launched_f2 = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 2,
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


    it('transaction in fireworks failed on Action Phase because insufficient funds ', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.0'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: 37,
            // exit code = Not enough TON. Message sends too much TON (or there is not enough TON after deducting fees). https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: Opcodes.set_first

        });

    })

    it('transaction should aborted with exit code = 9 ', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendBadMessage1(
            launcher.getSender(),
            toNano('2.0'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: 9,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: Opcodes.faked_launch
        })

    });

    it('transaction should aborted with exit code = 8 ', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendBadMessage2(
            launcher.getSender(),
            toNano('2.0'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: 8,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: Opcodes.faked_launch

        });

    })

});



