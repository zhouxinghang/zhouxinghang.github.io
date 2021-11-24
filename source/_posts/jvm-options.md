---
title: jvm参数
date: 2019-04-06 21:15:55
tags: [java, jvm]
categories: java基础
---

## -X 与 -XX 的区别

>**Standard options** :Options that begin with - are Standard options are expected to be accepted by all JVM implementations and are stable between releases (though they can be deprecated).
**Non-standard options** :Options that begin with -X are non-standard (not guaranteed to be supported on all JVM implementations), and are subject to change without notice in subsequent releases of the Java SDK.
**Developer options** :Options that begin with -XX are developer options and often have specific system requirements for correct operation and may require privileged access to system configuration parameters; they are not recommended for casual use. These options are also subject to change without notice.

## -XX 参数格式

1）布尔类型 `-XX:+option (true)   -XX:-option (false)`

`-XX:+DisableExplicitGC`

2）数值类型 `-XX:option=number`  可以带单位 k,m,g(不区分大小写)

`-XX:SurvivorRatio=8 -XX:MetaspaceSize=256M`

3）字符类型 `-XX:option=String`  通常用来设置文件名、路径等

`-XX:HeapDumpPath=./java_pid.hprof`

## 关于内存的参数设置

| 参数 | 说明 |
| --- | --- |
| -Xms | 初始堆大小，memory size |
| -Xmx | 堆最大值，max memory size，一般和 -Xms 设置同样的大小 |
| -Xmn | 新生代大小，new memory size |
| -Xss | 线程栈大小，stack size |
| -XX:PermSize=256m | 永生代初始大小，JDK 8无效，JDK8 将永生代移入到 metaspace |
| -XX:MaxPermSize=512m | 永生代最大值，JDK 8无效 |
| -XX:MaxMetaspaceSize=512m | 元空间初始化大小，JDK 8 |
| -XX:newRatio=2 | 默认是2，新生代站1/3 |
| -XX:Survivor=8 | 默认是8，两个 Survivor 共占用 2/10 |
| -XX:NewSize | 新生代初始化大小，一般和 -XX:MaxNewSize 设置同样大小，避免新生代内存伸缩 |
| -XX:MaxNewSize | 新生代最大值 |
| -XX:InitialCodeCacheSize=128m | “代码缓存”大小，“代码缓存”用来存储方法编译生成的本地代码 |

### jvm 设置新生代大小

jvm 设置新生代大小有很多组参数，大概分为三组：

- `-XX:NewSize=1024m` 和 `-XX:MaxNewSize=1024m` 
- `-Xmn1024m`
- `-XX:NewRatio=2` （假设Heap总共是3G）

在 JDK 4 之后，使用 `-Xmn=1024m`，相当于同时设置 `-XX:NewSize=1024m` 和 `-XX:MaxNewSize=1024m`，**推荐使用 -Xmn**

## 关于 GC 日志相关参数

| 参数 | 说明 |
| --- | --- |
| -XX:+PrintGC | 打印GC日志 |
| -XX:+PrintGCDetails | 打印GC详细日志，包括-XX:+PrintGC |
| -XX:+PrintGCTimeStamps | 打印GC时间戳 |
| -XX:+PrintGCDateStamps | 打印GC时间戳，以日期为准 |
| -XX:+PrintHeapAtGC | 在运行GC的前后打印堆信息 |
| -XX:+PrintTenuringDistribution | 新生代GC的时候，打印存活对象的年龄分布 |
| -XX:HeapDumpPath=/opt/log/oomlogs | 内存溢出时保存当时的内存快照 |
| -+HeapDumpOnOutOfMemoryError | 发生OOM时，保存dump内存快照 |     


## 关于 GC 行为相关参数

### CMS 相关参数
| 参数 | 含义 |
| --- | --- |
| -XX:+DisableExplicitGC | 禁用显示调用，System.gc()将成为空调用 |
| -XX:+UseConcMarkSweepGC | 使用CMS收集器收集老年代，特点是低停顿，停顿少。吞吐量相对较低，适合短连接事务型系统 |
| -XX:CMSInitiatingOccupancyFraction=80 | 在默认设置下，CMS收集器在老年代使用了68%的空间后就会被激活，可以适当调高，实际应用中老年代增长不会太快 |

### G1 相关参数

| 参数 | 含义 |
| --- | --- |
| -XX:G1HeapRegionSize=n | 设置Region大小，并非最终值 |
| -XX:MaxGCPauseMillis | 设置G1收集过程目标时间，默认值200ms，不是硬性条件 |
| -XX:G1NewSizePercent | 新生代最小值，默认值5% |
| -XX:G1MaxNewSizePercent | 新生代最大值，默认值60% |
| -XX:ParallelGCThreads | STW期间，并行GC线程数 |
| -XX:ConcGCThreads=n	 | 并发标记阶段，并行执行的线程数 |
| -XX:InitiatingHeapOccupancyPercent | 设置触发标记周期的 Java 堆占用率阈值。默认值是45%。这里的java堆占比指的是non_young_capacity_bytes，包括old+humongous |

## 参考

https://eyesmore.iteye.com/blog/1530996
https://stackoverflow.com/questions/7871870/what-is-the-difference-between-x-params-and-xx-params-in-jvm