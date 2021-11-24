---
title: ReentrantLock 实现原理
date: 2019-07-07 17:45:14
tags: [AQS, 源码]
categories: 并发编程
---

## Lock 简介

Lock 是 JDK1.5 之后提供的接口，它提供了和 synchronized 类似的同步功能，比 synchronized 更为灵活，能弥补 synchronized 在一些业务场景中的短板。

## Lock 的实现

### ReentrantLock

可重入，排他，公平/非公平

![656edd2a54b6e7e2d12eee8b5acf364c.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio18.svg?sanitize=true)

### ReentrantReadWriteLock

共享&排他，可重入

### StampedLock

共享锁

### CountdownLatch

共享锁

## AQS

在 Lock 中，用到了一个同步队列 AQS，全称 AbstractQueuedSynchronizer，它是一个同步工具也是 Lock 用来实现线程同步的核心组件。

### 结构

内部维护一个 FIFO 的双向链表，链表中的每个节点 Node 都记录了一个线程。当线程获取锁失败时，封装成 Node 加入到 AQS 队列中。当获取锁的线程释放锁时，会从队列中唤醒一个阻塞的线程。

![92c2cc530af01b066840778c43f98a23.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio19.svg?sanitize=true)

![da2d5aea6b673cc455edac54d4e3481c.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/86E865E0-52DF-44FB-B492-AA61CFEA23B6.png)

Node 的 state 状态值在不同的实现类中表示不同的意思，

### 竞争锁节点的操作

#### 竞争成功

假如第二个节点获取到了锁，head指向获取锁的节点，并断开与 next 的连接（前置节点 next 指向 null）

![f561203cfae0ef0fe86986468953a37c.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio20.svg?sanitize=true)

获取到锁的线程（头结点），会重新设置 head 指针，不存在竞争，普通操作即可。

#### 竞争失败

![19b66fb4c796bdafcd10a7de44afa8a4.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio21.svg?sanitize=true)

只有 CAS 操作成功了，再去设置尾节点的 prev，此时不存在竞争，普通操作即可。

### ReentrantLock#lock 的源码分析

#### lock 操作时序图

![a20045e951f6210a66851e5104e9cc25.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio22.svg?sanitize=true)

#### NonfairSync#lock

非公平锁和公平锁的区别是，非公平锁会先尝试修改 state 状态为1，修改成功表示获取锁成功，修改失败，会走 AQS 的 acquire 操作。

![8a589015f47656f44c4874f7bb3cfbe8.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/090C1BD5-0DA2-417E-BDC0-7F8DC6080EA6.png)

#### AQS#acquire

会想尝试获取锁 tryAcquire，获取失败会将当前线程封装成 Node 节点添加到 AQS 队尾 addWaiter，并自旋尝试获取锁 acquireQueued。

![db45385397adbe6de234de48641f96ec.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/4BC11C7A-329A-42B6-993B-51A9D077DEED.png)

#### NonfairSync#tryAcquire

尝试获取锁，成功返回 true，不成功返回 false

![cfb2330ae916543f626159ebbfeb4aea.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/C51813C0-1A70-43C2-9904-A34DB96EE26F.png)

无锁：尝试获取锁。有锁：判断是否是当前线程获取了锁

![b2812a7ffaf51eed3bb36c411f024e2d.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/353F2EF6-4909-4DC4-97B4-308B2F2D5413.png)

#### AQS#addWaiter

如果 tryAcquire 方法获取锁失败后，会调用 addWaiter 将当前线程封装成 Node 添加到队尾。

如果队列不为空，尝试一次 CAS 添加对队尾。如果不成功，就调用 enq 方法自旋 CAS 添加到队列尾部

![94da97d14eb4f5b88876b443a85bd147.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/247CCDDA-5950-4769-B03F-4BDF87F9D118.png)

#### 流程总结 tryAcquire -> addWaiter

![d706ed505dbffc01c27cddc83a5e46b4.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/8832D866-6264-40BF-8B5F-C7CCC39DD3A4.png)

#### AQS#acquireQueued

如果前置节点是头结点，就尝试获取锁。否则将前置节点 waitStatus 改为 SIGNAL，然后将当前线程挂起

![2f9dcc6b6d65837b462638b26989fc30.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/8A25196E-2E38-4635-AEF1-24401A3ABC89.png)

### ReentrantLock#unlock 源码分析

释放锁，会唤醒后续的节点，唤醒的节点会在 acquireQueued 方法中继续运行（哪里跌倒，哪里爬起）

### AQS 疑难解惑

#### enq 方法返回前置节点

enq 方法，自旋将 node 添加到队列尾部，返回的是 node 的前置节点

#### AQS 需要一个虚拟的 head 节点

线程挂起，需要将前置节点 ws 改为 SIGNAL 状态，这样才能保证自己被唤醒。虚拟的 head 节点就是为了处理这样的边界情况，保证第一个包含了线程的节点能够被唤醒。

#### AQS 通过判断前置节点 waitStatus 来唤醒节点线程，为什么？

保证状态一致性，防止重复唤醒 

## 参考

https://www.cnblogs.com/stateis0/p/9062045.html

https://www.cnblogs.com/dennyzhangdd/p/7218510.html#_label0
