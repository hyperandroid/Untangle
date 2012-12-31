# Untangle - An asynchronous utility library for Node

## Description

Untangle (_u namespace) aims to put under control the NodeJS asynchronous callback nightmare
by using stateful objects.
Based in the concept of a Condition, it offers fine control for Parallel Condition Tree evaluation and
Queue/Dispatcher/Pool management.
A Condition is a stateful Condition, where setting the same value for a Condition object will take no effect.

##How to

Untangle is valid to be used in the browser, NodeJs or as an AMD/Require module.