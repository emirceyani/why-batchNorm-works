import * as tf from '@tensorflow/tfjs';
import {Scalar, serialization, Tensor, tidy, util} from '@tensorflow/tfjs-core';

import * as hparam from "./hyperParams"

// Loss function
export function loss(labels, ys) {
  return tf.losses.softmaxCrossEntropy(labels, ys).mean();
}

// Variables that we want to optimize****************************************************
var conv1OutputDepth = 8;
var conv1Weights_;

var conv2InputDepth = conv1OutputDepth;
var conv2OutputDepth = 16;
var conv2Weights_;

var fullyConnectedWeights_;
var fullyConnectedBias_ ;
//**************************************************************************************

export function freshParams(){
  conv1Weights_ =
      tf.variable(tf.randomNormal([5, 5, 1, conv1OutputDepth], 0, 0.1));

  conv2Weights_ =
      tf.variable(tf.randomNormal([5, 5, conv2InputDepth, conv2OutputDepth], 0, 0.1));

  fullyConnectedWeights_ = tf.variable(tf.randomNormal(
      [7 * 7 * conv2OutputDepth, hparam.LABELS_SIZE], 0,
      1 / Math.sqrt(7 * 7 * conv2OutputDepth)));
  fullyConnectedBias_ = tf.variable(tf.zeros([hparam.LABELS_SIZE]));
}

// Our actual model
export function model(inputXs, noise=false) {


  var xs = inputXs.as4D(-1, hparam.IMAGE_SIZE, hparam.IMAGE_SIZE, 1);

  var strides = 2;
  var pad = 0;

  // Conv 1
  var layer1 = tf.tidy(() => {
    return xs.conv2d(conv1Weights_, 1, 'same')
        .relu()
        .maxPool([2, 2], strides, pad);
  });

  // Conv 2
  var layer2 = tf.tidy(() => {
    return layer1.conv2d(conv2Weights_, 1, 'same')
        .relu()
        .maxPool([2, 2], strides, pad);
  });

  // Final layer
  return layer2.as2D(-1, fullyConnectedWeights_.shape[0])
      .matMul(fullyConnectedWeights_)
      .add(fullyConnectedBias_);
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