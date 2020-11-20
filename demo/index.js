const Simulator = require('scf-service-stack').simulator;
const fs = require('fs');
const simulator = new Simulator(require('./env.json'));
simulator.deploy(require('./app'));
