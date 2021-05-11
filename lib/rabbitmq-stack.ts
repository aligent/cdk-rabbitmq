// import * as cdk from '@aws-cdk/core';
import * as mq from '@aws-cdk/aws-amazonmq'; 
import { Construct, StackProps, Stack, CfnOutput } from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface ResourceProps extends StackProps {
  envname: string;
  rabbitmqProps: mq.CfnBrokerProps;
  magentoVpcId: string;
  magentoBackendEcsHostSecurityGroupId: string;
}

export class RabbitMQStack extends Stack {
  constructor(scope: Construct, id: string, props: ResourceProps) {
    super(scope, id, props);

    const sourceSG = ec2.SecurityGroup.fromLookup(this, 'php-fpm', props.magentoBackendEcsHostSecurityGroupId)
    const magentoVpc = ec2.Vpc.fromLookup(this, 'magentoVPC', {vpcId: props.magentoVpcId} )
    const securityGroup = new ec2.SecurityGroup(this, id, {
      vpc: magentoVpc,
      allowAllOutbound: false,
    })

    securityGroup.addIngressRule(sourceSG, ec2.Port.tcp(5671));
    securityGroup.addIngressRule(sourceSG, ec2.Port.tcp(443));

    // Choose only one or two subnets out of all the available private ones
    const rabbitMqSubnets: string[] = [];
    if (props.rabbitmqProps.deploymentMode == 'SINGLE_INSTANCE') {
      rabbitMqSubnets.push(magentoVpc.privateSubnets[0].subnetId);
    } else {
      rabbitMqSubnets.push(magentoVpc.privateSubnets[0].subnetId);
      rabbitMqSubnets.push(magentoVpc.privateSubnets[1].subnetId);
    };
    
    const rabbitmq = new mq.CfnBroker(this, props.envname, {
      autoMinorVersionUpgrade: props.rabbitmqProps.autoMinorVersionUpgrade,
      brokerName: props.rabbitmqProps.brokerName,
      deploymentMode: props.rabbitmqProps.deploymentMode,
      engineType: props.rabbitmqProps.engineType,
      engineVersion: props.rabbitmqProps.engineVersion,
      hostInstanceType: props.rabbitmqProps.hostInstanceType,
      publiclyAccessible: props.rabbitmqProps.publiclyAccessible,
      users: props.rabbitmqProps.users,
      logs: props.rabbitmqProps.logs,
      maintenanceWindowStartTime: props.rabbitmqProps.maintenanceWindowStartTime,
      securityGroups: [ securityGroup.securityGroupId ],
      subnetIds: rabbitMqSubnets,
    });

    // Cfn does not respect .split(). We will get by with Arn for now.
    // const arn = rabbitmq.attrArn
    // const endpoint = arn.split(":", 7) + '.mq.' + this.region + '.amazonaws.com'
    new CfnOutput(this, rabbitmq.brokerName + 'Arn', {
      // value: rendpoint,
      value: rabbitmq.attrArn,
      exportName: rabbitmq.brokerName + 'Arn'
    });
  }
};