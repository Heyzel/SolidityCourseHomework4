module.exports = async ({getNamedAccounts, deployments}) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const fee = 10;
    const feeRecipient = deployer;

    const _args = [feeRecipient, fee];

    await deploy('TinySwapperV1', {
        from: deployer,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                init: {
                    methodName: "initialize",
                    args: _args,
                },
            },
        },
        log: true
    });

};

module.exports.tags = ['TinySwapperV1'];