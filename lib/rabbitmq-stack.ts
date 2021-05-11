import * as mq from '@aws-cdk/aws-amazonmq'; 
import { Construct, StackProps, Stack, CfnOutput } from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface ResourceProps extends StackProps {
  envName: string;
  rabbitMQProps: mq.CfnBrokerProps;
  applicationVpcId: string;
  applicationSecurityGroupId: string;
}

export class RabbitMQStack extends Stack {
  constructor(scope: Construct, id: string, props: ResourceProps) {
    super(scope, id, props);

    const sourceSecurityGroup = ec2.SecurityGroup.fromLookup(this, 'sourceSecurityGroup', props.applicationSecurityGroupId)
    const applicationVpc = ec2.Vpc.fromLookup(this, 'applicationVpc', {vpcId: props.applicationVpcId} )
    const securityGroup = new ec2.SecurityGroup(this, id, {
      vpc: applicationVpc,
      allowAllOutbound: false,
    })

    securityGroup.addIngressRule(sourceSecurityGroup, ec2.Port.tcp(5671));
    securityGroup.addIngressRule(sourceSecurityGroup, ec2.Port.tcp(443));

    // Choose only one or two subnets out of all the available private ones
    const rabbitMqSubnets: string[] = [];
    if (props.rabbitMQProps.deploymentMode == 'SINGLE_INSTANCE') {
      rabbitMqSubnets.push(applicationVpc.privateSubnets[0].subnetId);
    } else {
      rabbitMqSubnets.push(applicationVpc.privateSubnets[0].subnetId);
      rabbitMqSubnets.push(applicationVpc.privateSubnets[1].subnetId);
    };
    
    const rabbitMQ = new mq.CfnBroker(this, props.envName, {
      autoMinorVersionUpgrade: props.rabbitMQProps.autoMinorVersionUpgrade,
      brokerName: props.rabbitMQProps.brokerName,
      deploymentMode: props.rabbitMQProps.deploymentMode,
      engineType: props.rabbitMQProps.engineType,
      engineVersion: props.rabbitMQProps.engineVersion,
      hostInstanceType: props.rabbitMQProps.hostInstanceType,
      publiclyAccessible: props.rabbitMQProps.publiclyAccessible,
      users: props.rabbitMQProps.users,
      logs: props.rabbitMQProps.logs,
      maintenanceWindowStartTime: props.rabbitMQProps.maintenanceWindowStartTime,
      securityGroups: [ securityGroup.securityGroupId ],
      subnetIds: rabbitMqSubnets,
    });

    // Cfn does not respect .split(). We will get by with Arn for now.
    // const arn = rabbitmq.attrArn
    // const endpoint = arn.split(":", 7) + '.mq.' + this.region + '.amazonaws.com'
    new CfnOutput(this, rabbitMQ.brokerName + 'Arn', {
      // value: rendpoint,
      value: rabbitMQ.attrArn,
      exportName: rabbitMQ.brokerName + 'Arn'
    });
  }
};