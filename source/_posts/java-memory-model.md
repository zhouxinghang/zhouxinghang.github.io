---
title: java内存模型
date: 2019-02-28 23:10:47
tags: [java,jvm,jmm]
categories: java进阶
---

## 基础

### 现代计算机物理内存模型

![物理内存模型](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/memory_model_physical.png)

**访问局部性**（英语：Locality of reference）
>访问局部性分为两种基本形式，一种是时间局部性，另一种是空间局部性。时间局部性指的是，程序在运行时，最近刚刚被引用过的一个内存位置容易再次被引用，比如在调取一个函数的时候，前不久才调取过的本地参数容易再度被调取使用。空间局部性指的是，最近引用过的内存位置以及其周边的内存位置容易再次被使用。空间局部性比较常见于循环中，比如在一个数列中，如果第3个元素在上一个循环中使用，则本次循环中极有可能会使用第4个元素。


### 指令重排序

指令重排序是为了提高程序性能做得优化，比如多次写操作，每次都要会写内存，可以在线程的 working memory 操作完成后，一起回写内存。

指令重排序包括：

* 编译器优化重排序
* 指令级并行重排序
* 内存系统的重排序

#### as-if-serial

无论如何重排序,程序执行的结果都应该与代码顺序执行的结果一致(Java编译器,运行时和处理器都会保证java在单线程下遵循as-if-serial语义).

#### 线程的 working memory

是 cache 和寄存器的抽象，解释源于《Concurrent Programming in Java: Design Principles and Patterns, Second Edition》，而不单单是内存的某个部分

## Java 内存模型（Java Memory Model）

Java内存模型(Java Memory Model)描述了Java程序中各种变量(线程共享变量)的访问规则,以及在JVM中将变量存储到内存和从内存中读取出变量这样的底层细节.

### happens-before 原则

规定了 java 指令操作的偏序关系。是 JMM 制定的一些偏序关系，用于保证内存的可见性。

8大 happens-before 原则：

* 单线程happen-before原则：在同一个线程中，书写在前面的操作happen-before后面的操作。
* 锁的happen-before原则：同一个锁的unlock操作happen-before此锁的lock操作。
* volatile的happen-before原则：对一个volatile变量的写操作happen-before对此变量的任意操作(当然也包括写操作了)。
* happen-before的传递性原则：如果A操作 happen-before B操作，B操作happen-before C操作，那么A操作happen-before C操作。
* 线程启动的happen-before原则：同一个线程的start方法happen-before此线程的其它方法。
* 线程中断的happen-before原则：对线程interrupt方法的调用happen-before被中断线程的检测到中断发送的代码。
* 线程终结的happen-before原则：线程中的所有操作都happen-before线程的终止检测。
* 对象创建的happen-before原则：一个对象的初始化完成先于他的finalize方法调用。

### 内存可见性

#### 共享变量实现可见性原理

线程1对共享变量的修改对线程2可见，需要2个步骤：

* 将工作内存1中修改的共享变量刷新到主内存
* 将主内存最新的共享变量更新到工作内存2


#### synchronized

JMM 关于synchronized 的两条规定：

* 线程解锁前，刷新共享变量到主存
* 线程加锁前，获取主存中共享变量最新值到工作内存

#### volatile

有内存栅栏（或内存屏障）和防止指令重排序

JMM 中，在 volatile 变量写操作后加入 store 栅栏（(强制将变量值刷新到主内存中去)），在读操作前加入 load 栅栏（强制从主内存中读取变量的值）

## 参考

https://www.jianshu.com/p/1508eedba54d
https://www.jianshu.com/p/47f999a7c280
http://ifeve.com/easy-happens-before/