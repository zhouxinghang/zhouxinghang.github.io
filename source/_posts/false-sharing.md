---
title: 伪共享
date: 2019-02-28 20:04:04
categories: java进阶
tags: [java, 并发编程]
---

### 伪共享

在 cpu 和 内存之间有高速缓存区（cache）,cache 一般集成在 cpu 内部，也叫做 cpu Cache。如下图是一个二级缓存示意图。
![二级缓存示意图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/file.png)

cache 内部是按照行来存储的，每行称为一个 cache 行，大小为2的n次幂，一个 cache 行 可能会存有多个变量数据
![cache行](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/file2.png)

当多个线程同时修改一个 cache 行里面的多个变量时候，由于同时只能有一个线程操作缓存行，所以相比每个变量放到一个缓存行性能会有所下降，这就是伪共享。

当单个线程顺序访问同一个 cache 行的多个变量，利用**程序运行局部性原理**会加快程序运行。当多个程序同时访问同一个 cache 行的多个变量，会发生竞争，速度会慢