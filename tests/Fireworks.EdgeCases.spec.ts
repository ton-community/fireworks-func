import {
    Blockchain,
    BlockchainSnapshot,
    printTransactionFees,
    SandboxContract,
    TreasuryContract,
} from '@ton-community/sandbox';
import { Cell, toNano, beginCell, Address } from 'ton-core';
import { ExitCode, Fireworks, OPCODES } from '../wrappers/Fireworks';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Edge Cases Tests', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let fireworks: SandboxContract<Fireworks>;
    let launched_f1: SandboxContract<Fireworks>;
    let launched_f2: SandboxContract<Fireworks>;

    let launcher: SandboxContract<TreasuryContract>;
    let initialState: BlockchainSnapshot;

    beforeAll(async () => {
        code = await compile('Fireworks');

        blockchain = await Blockchain.create();
        // blockchain.verbosity = {
        //     ...blockchain.verbosity,
        //     blockchainLogs: true,
        //     vmLogs: 'vm_logs_full',
        //     debugLogs: true,
        //     print: false,
        // };

        launcher = await blockchain.treasury('launcher');

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

        initialState = blockchain.snapshot();
    });

    it('transaction in fireworks failed on Action Phase because insufficient funds ', async () => {
        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('2.0'));

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: 37,
            // exit code = Not enough TON. Message sends too much TON (or there is not enough TON after deducting fees). https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.SET_FIRST,
        });

        await blockchain.loadFrom(initialState);
    });

    it('transaction should aborted with exit code = 1 ', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.SuccessAlt, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: true,
            exitCode: ExitCode.SuccessAlt,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });

        await blockchain.loadFrom(initialState);
    });

    it('transaction should aborted with exit code = 2 ', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.StackUnderflow, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.StackUnderflow,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });

        await blockchain.loadFrom(initialState);
    });

    it('transaction should aborted with exit code = 8 ', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.CellOverflow, 8)
            .storeRef(beginCell().storeUint(1, 256).storeUint(2, 256).storeUint(3, 256).storeUint(4, 255).endCell()) // 1023 bits cell
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.CellOverflow,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });

        await blockchain.loadFrom(initialState);
    });

    it('transaction should aborted with exit code = 9 ', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.CellUnderflow, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.CellUnderflow,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });

        await blockchain.loadFrom(initialState);
    });
});
