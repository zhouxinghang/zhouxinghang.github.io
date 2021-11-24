---
title: caffeine 缓存实现原理
date: 2019-05-12 21:04:31
tags: [caffeine, 源码]
categories: javaWeb
---

## 一、背景

我们知道 HashMap 可以作为进程内缓存，他不受外部系统影响，速度快。但是他不能像分布式缓存那样能够实时刷新，且本地内存有限，需要限定 HashMap 的容量范围，这就涉及到缓存淘汰问题。为了解决本地缓存的这些问题，Guava Cache 应运而生，他提供了异步刷新和 LRU 淘汰策略。Guava Cache 功能虽然强大，但是只是对 LRU 的一层封装，在复杂的业务场景下，LRU 淘汰策略显得力不从心。为此基于  W-TinyLFU(LFU+LRU算法的变种) 淘汰策略的进程内缓存 —— Caffeine Cache 诞生了。

Caffeine 的设计实现来自于大量优秀的研究，SpringBoot2 和 Spring5 已经默认支持 Caffeine Cache 代替原来的 Guava Cache，足以见得  Caffeine Cache 的地位。

本文将试着探究 Guava Cache 和 Caffeine Cache 的实现原理，重点讲解 Caffeine Cache 相比于 Guava Cache 有哪些优秀的设计和改动。本文研究的 caffeine 版本是 2.7.0，guava 版本是 27.1-jre。

## 二、缓存淘汰算法

因为本地内存非常有限，我们的进程内缓存必须是有界的，需要进行数据淘汰，将无效的数据驱逐。一个好的淘汰算法，决定了其命中率高低。下面会简单介绍一些常见的淘汰算法，以便于后续的深入讲解。

### 2.1 LFU

LFU（Least Frequently Used，最近最不常用）根据数据的访问频率，淘汰掉最近访问频率最低的数据，其核心思想是“如果数据过去被访问多次，那么将来被访问的频率也更高”。

需要维护每个数据项的访问频率信息，每次访问都需要更新，这个开销是非常大的。

LFU 能够很好地应对偶发性、周期性的批量操作，不会造成缓存污染。但是对于突发性的热点事件，比如外卖中午时候访问量突增、微博爆出某明星糗事就是一个突发性热点事件。当事件结束后，可能没有啥访问量了，但是由于其极高的访问频率，导致其在未来很长一段时间内都不会被淘汰掉。

### 2.2 LRU

LRU（Least recently used，最近最少使用）根据数据的访问记录，淘汰掉最近最少使用的数据，其核心思想是“如果数据最近被访问过，那么将来被访问的几率也更高”（时间局部性原理）。

需要用 queue 来保存访问记录，可以用 LinkedHashMap 来简单实现一个基于 LRU 算法的缓存。

当存在热点数据时，LRU的效率很好。但偶发性的、周期性的批量操作会导致LRU命中率急剧下降，缓存污染情况比较严重。

### 2.3 TinyLFU

TinyLFU 顾名思义，轻量级LFU，相比于 LFU 算法用更小的内存空间来记录访问频率。

TinyLFU 维护了近期访问记录的频率信息，不同于传统的 LFU 维护整个生命周期的访问记录，所以他可以很好地应对突发性的热点事件（超过一定时间，这些记录不再被维护）。这些访问记录会作为一个过滤器，当新加入的记录（New Item）访问频率高于将被淘汰的缓存记录（Cache Victim）时才会被替换。流程如下：

![08c4cfb4641549d3fb651df6d21425c7.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio7.svg?sanitize=true)

尽管维护的是近期的访问记录，但仍然是非常昂贵的，TinyLFU 通过 Count-Min Sketch 算法来记录频率信息，它占用空间小且误报率低，关于 Count-Min Sketch 算法可以参考论文：[pproximating Data with the Count-Min Data Structure](http://dimacs.rutgers.edu/~graham/pubs/papers/cmsoft.pdf)

### 2.4 W-TinyLFU

W-TinyLFU 算法相比于 LRU 等算法，具有更高的命中率。下图是一个运行了 ERP 应用的数据库服务中各种算法的命中率，实验数据来源于 ARC 算法作者，更多场景的性能测试参见：[官网](https://github.com/ben-manes/caffeine/wiki/Efficiency)

![fc0df0eba9c3b7485b30d498559d98ac.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/66CBD80A-A07E-48CC-8CA8-19FE4ED688FB.png)
（图片来源于：https://github.com/ben-manes/caffeine/wiki/Efficiency）

W-TinyLFU 算法是对 TinyLFU算法的优化，能够很好地解决一些稀疏的突发访问元素。在一些数目很少但突发访问量很大的场景下，TinyLFU将无法保存这类元素，因为它们无法在短时间内积累到足够高的频率，从而被过滤器过滤掉。W-TinyLFU 将新记录暂时放入 Window Cache 里面，只有通过 TinLFU 考察才能进入 Main Cache。大致流程如下图：

![394b28c7e161703b4630108f894f9ece.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio8.svg?sanitize=true)

## 三、缓存事务

为了实现缓存的过期策略，我们需要在访问数据的时候记录一系列信息，我们将该操作定义为**缓存事务**。

对于一个实现了写后过期的缓存，需要在其 put 操作时，记录 entry 的写时间，后续通过这个 entry 写时间来判断其是否过期。对于一个实现了读后过期的缓存，需要在其 get 操作时记录 entry 的最后访问时间，后续通过 entry 的最后访问时间来判断其是否过期。对于一个实现了 LFU 淘汰策略的缓存，需要在每次 get 操作时记录 entry 的访问次数，后续通过 entry 的访问次数来判断其是否淘汰。为了便于后续的表述，对于这种为实现缓存的过期淘汰策略而做的一系列额外操作，我们将其定义为**缓存事务**。

## 四、guava 缓存

guava 缓存提供了基于容量、时间、引用的过期策略。基于容量的实现是采用 LRU 算法。基于引用的实现是借助于 JVM GC，因为缓存的key被封装在WeakReference引用内，缓存的Value被封装在WeakReference或SoftReference引用内。

为了减少读写缓存的并发问题，参考了 JDK1.7 版本的 ConcurrentHashMap，实现了分段锁机制来减少锁粒度。然而分段锁机制不是非常好的方案，JDK1.8 已经取消了 ConcurrentHashMap 的分段锁，采用的 CAS + synchronized，他只锁住数组的单个元素。关于 ConcurrentHashMap 在 JDK1.8  中的改进，这里不再展开。

采用 LRU 过期策略，每个 Segment 维护三个 queue，writeQueue 、 accessQueue和recencyQueue。其中 recencyQueue 是记录 get 操作命中的，accessQueue 是记录 get 操作未命中的。recencyQueue 是无锁操作，需要保证线程安全。  值得注意的是，在高并发下，queue的竞争是比较激烈，guava 是在 每个 put/get 操作时记录到对应的 queue，这样增加了用户端的耗时。

过期策略是在访问数据的时候，判断是否过期。这样做好处是不需要后台线程定期扫描，但增加了耗时和内存损耗（本该过期的数据没有及时过期）。

### 4.1 Guava 缓存的执行流程

guava 的事务操作是在读取缓存时一起执行的，读取缓存操作流程如下：

![ec637600e0c6833c9b23076f48e3487a.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio9.svg?sanitize=true)

事务处理在读取缓存时同步进行，这样的好处是不需要后台线程定期扫描处理事务，保证数据的实时性，但会增加一定的耗时。

### 4.2 Guava 缓存中的事务处理

![bbd76bb898c0e572a12de5d4ba0c2c37.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio10.svg?sanitize=true)

采用 LRU 过期策略，每个 Segment 维护三个 queue，writeQueue 、 accessQueue和recencyQueue。用来实现不同情况的 LRU 淘汰策略。其中 recencyQueue 是**记录 get 命中操作的**，这是个多线程操作，Guava 通过线程安全的 recencyQueue 来记录，然后通过单线程批量 recencyQueue 将访问记录添加到非线程安全的 accessQueue，可以看出 recencyQueue **起到缓冲的作用**。  正因为 recencyQueue 是线程安全的，在 get 操作时又增加了并发竞争耗时（将 Entry 添加到 recencyQueue）。

## 五、caffeine 缓存

相比于 Guava 缓存，采用了更加先进的过期策略 W-TinyLFU，通过 RingBuffer 缓存事务，并用后台进程批量处理事务。Caffeine 直接采用的是 ConcurrentHashMap，要知道 ConcurrentHashMap 在 JDK1.8 是有非常大的性能提升的。

简单讲，Caffeine 是对 ConcurrentHashMap 进行封装，采用缓冲和后台线程批量处理事务，Caffeine 官方称其并发性能近视等于 ConcurrentHashMap。

Caffeine 官方做了性能测试，其中 6 线程读 2 线程写吞吐量如下图：

![f9487f4ff3617d4f5c8c80f3186cf8e8.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/7B9BF947-6252-46E6-B0B5-77DE828AD6FE.png)
（图片来源于：https://github.com/ben-manes/caffeine/wiki/Benchmarks）

可以看到 Caffeine 缓存吞吐量远超 Guava 缓存，其余场景性能测试详见：[官网](https://github.com/ben-manes/caffeine/wiki/Benchmarks)

### 5.1 基于 W-TinyLFU

前面已经提到了 W-TinyLFU 算法，Caffeine 采用 W-TinyLFU 算法来实现其淘汰策略。Caffeine 内部维护了三个 queue，分别为：

* access order queue，实现读后过期
* write order queue，实现写后过期
* Hierarchical TimerWheel，实现定时过期

在大多数情况下，读操作远比写操作多，因此 Caffeine 为了提高读并发能力，采用分段策略，将 access order queue 分为三种，分别是 WindowDeque、ProbationDeque、ProtectedDeque。这三者关系如下：

![d5044eb799b261357b0a4ce8f762989b.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio11.svg?sanitize=true)

结合 W-TinyLFU 算法，可以得出记录从产生到淘汰的整个流程：

![f575ccd5c3ee35ca692a41ee0faa5505.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/57F8E049-C5CE-4538-A6C0-9F9D071D7BF7.png)
（图片来源于：http://highscalability.com/blog/2016/1/25/design-of-a-modern-cache.html）

新的记录会进入第一个 LRU，这个在 Caffeine 里是 WindowDeque。之后通过过滤器过滤，过滤器通过访问频率来实现过滤，只有高于将要淘汰数据的使用频率才能进入缓存。这个频率信息维护就是前面提到的 Count-Min Sketch 算法来实现的，具体是 FrequencySketch 类。

#### 5.1.1 过期策略

Caffeine 采用统一的过期时间，这样可以实现 O(1) 复杂度往队列里添加和取出记录。对于写后过期，维护一个写入顺序队列，对于读后过期，维护一个读顺序队列。值得注意的是，这些操作都是单线程异步执行的。

### 5.2 执行流程

与 Guava 最大的不同就是，Caffeine 在读取缓存操作时，将**事务提交到缓存异步批量处理**，大致处理流程如下：

![a90c9c637a6b76cf46f13d01815bcd86.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio12.svg?sanitize=true)

### 5.3 缓存区

#### 5.3.1 readBuffer

![36ba91e8ba3b79918b10cdf7b9d17082.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio13.svg?sanitize=true)

采用RingBuffer，有损。为了进一步减少读并发，采用多个 RingBuffer（striped ring buffer 条带环形缓冲），通过线程 id 哈希到对应的RingBuffer。环形缓存的一个显著特点是不需要进行 GC，直接通过覆盖过期数据。

当一个 RingBuffer 容量满载后，会触发异步的执行操作，而后续的对该 ring buffer 的写入会被丢弃，直到这个 ring buffer 可被使用，因此 readBuffer 记录读缓存事务是有损的。因为读记录是为了优化驱策策略，允许他有损。

#### 5.3.2 writeBuffer

采用传统的有界队列 ArrayQueue，无损

### 5.4 状态机

缓冲区和细粒度的写带来了单个数据项的操作乱序的竞态条件。插入、读取、更新、删除都可能被各种顺序的重放，如果这个策略控制的不合适，则可能引起悬垂索引。解决方案是通过状态机来定义单个数据项的生命周期。这类似于 AQS 中的原子类型变量 state。

![7744cc0f1faa13cb71a53c2033fe495c.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio14.svg?sanitize=true)

### 5.5 事务处理

![4aa939e0c2bfc37f2463823eeeca80d7.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio15.svg?sanitize=true)

### 5.6 caffeine get 操作流程图

![f07e7f28159908d5899cb36643be3c46.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio16.svg?sanitize=true)

![4fe5bac0356b7e0baf8f181938b1bcde.png](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio17.svg?sanitize=true)


## 六、参考

http://highscalability.com/blog/2016/1/25/design-of-a-modern-cache.html

https://github.com/ben-manes/caffeine

[TinyLFU: A Highly Eﬃcient Cache Admission Policy](https://arxiv.org/pdf/1512.00727.pdf)

[Approximating Data with the Count-Min Data Structure](http://dimacs.rutgers.edu/~graham/pubs/papers/cmsoft.pdf)

https://segmentfault.com/a/1190000016091569

https://chuansongme.com/n/2254051

