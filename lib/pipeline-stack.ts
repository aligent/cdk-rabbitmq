import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, Stack, StackProps, StageProps, Stage, } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";

import { ResourceProps, RabbitMQStack } from './rabbitmq-stack';

// Parameters for Stage that triggers the resource stack build
interface PipelineStageProps extends StageProps {
    envname: string,
    ResourceProps: ResourceProps,
}

// Define Stage details
class PipelineStage extends Stage {
    constructor(scope: Construct, id: string, props: PipelineStageProps) {
        super(scope, id, props);
        new RabbitMQStack(this, 'stack', props.ResourceProps);
    }
}

// Paremeters for Pipeline that runs the Stage
interface PipelineProps extends StackProps {
    envName: string;
    owner: string;
    repo: string;
    branch: string;
    connectionArn: string;
    stageConfig: PipelineStageProps;
    manualApprovals: boolean;
}

// Define Pipeline details
export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const pipeline = new CdkPipeline(this, props.envName + '-pipeline', {
        pipelineName: id,
        cloudAssemblyArtifact,
        sourceAction: new codepipeline_actions.BitBucketSourceAction({
            actionName: 'BitBucket',
            output: sourceArtifact,
            owner: props.owner,
            repo: props.repo,
            branch: props.branch,
            connectionArn: props.connectionArn,
            codeBuildCloneOutput: true
        }),
        synthAction: SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            synthCommand: 'npx cdk synth ' + id
        }), 
    });

    pipeline.addApplicationStage(new PipelineStage(this, id, props.stageConfig), {manualApprovals: props.manualApprovals})

    }
}