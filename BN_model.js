import * as tf from '@tensorflow/tfjs';
import {Scalar, serialization, Tensor, tidy, util} from '@tensorflow/tfjs-core';

import * as hparam from "./hyperParams"

// Loss function
export function loss(labels, ys) {
  return tf.losses.softmaxCrossEntropy(labels, ys).mean();
}

// Variables that we want to optimize****************************************************
var strides = 2;
var pad = 0;

var conv1OutputDepth = 8;
var conv1Weights;

var conv2InputDepth = conv1OutputDepth;
var conv2OutputDepth = 16;
var conv2Weights;

var fullyConnectedWeights;
var fullyConnectedBias;

var scale1;
var offset1;

var scale2;
var offset2;

var moments;
var moments2;
//**************************************************************************************

export function freshParams(){
  conv1Weights =
      tf.variable(tf.randomNormal([5, 5, 1, conv1OutputDepth], 0, 0.1));


  scale1 = tf.variable(tf.randomNormal([conv1OutputDepth], 0, 0.1));
  offset1 = tf.variable(tf.zeros([conv1OutputDepth]));

  conv2Weights =
      tf.variable(tf.randomNormal([5, 5, conv2InputDepth, conv2OutputDepth], 0, 0.1));

  scale2 = tf.variable(tf.randomNormal([conv2OutputDepth], 0, 0.1));
  offset2 = tf.variable(tf.zeros([conv2OutputDepth]));

  fullyConnectedWeights = tf.variable(tf.randomNormal(
      [7 * 7 * conv2OutputDepth, hparam.LABELS_SIZE], 0,
      1 / Math.sqrt(7 * 7 * conv2OutputDepth)));
  fullyConnectedBias = tf.variable(tf.zeros([hparam.LABELS_SIZE]));
}


// Our actual model
export function model(inputXs, noise=false) {
  var xs = inputXs.as4D(-1, hparam.IMAGE_SIZE, hparam.IMAGE_SIZE, 1);

  // Conv 1
  var layer1 = tf.tidy(() => {
    return xs.conv2d(conv1Weights, 1, 'same')
        .relu()
        .maxPool([2, 2], strides, pad);
  });


  // BatchNorm 1
  var varianceEpsilon = 1e-6
  moments = tf.tidy(() => {
    return tf.moments(layer1, [0, 1, 2]);
  });
  //console.log('layer1 : ' + layer1.shape + ' Mean: ' + moments.mean.shape + ' Variance: ' + moments.variance.shape );
  //console.log('scale1: ' + scale1.shape + ' offset1: ' + offset1.shape)
  layer1 = tf.tidy(() => {
    return layer1.batchNormalization(moments.mean, moments.variance, varianceEpsilon, scale1, offset1);
  });


  // Conv 2
  var layer2 = tf.tidy(() => {
    return layer1.conv2d(conv2Weights, 1, 'same')
        .relu()
        .maxPool([2, 2], strides, pad);
  });

  // BatchNorm 2
  moments2 = tf.tidy(() => {
    return tf.moments(layer2, [0, 1, 2]);
  });
  layer2 = tf.tidy(() => {
    return layer2.batchNormalization(moments2.mean, moments2.variance, varianceEpsilon, scale2, offset2);
  });

  // Final layer
  return layer2.as2D(-1, fullyConnectedWeights.shape[0])
      .matMul(fullyConnectedWeights)
      .add(fullyConnectedBias);
}









// Predict the digit number from a batch of input images.
export function predict(x) {
  return tf.tidy(() => {
    const axis = 1;
    return model(x);
  });
  //return Array.from(pred.dataSync());
}

// Given a logits or label vector, return the class indices.
export function classesFromLabel(y) {
  const axis = 1;
  const pred = y.argMax(axis);

  return Array.from(pred.dataSync());
}
