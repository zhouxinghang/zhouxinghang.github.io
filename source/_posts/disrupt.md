---
title: disrupt 实现原理
date: 2019-06-23 21:59:08
tags: [disruptor, 源码]
categories: javaWeb
---

## 一、Disruptor 简介

线程间通讯框架，实现多线程共享数据。是一个高性能无锁队列，由英国外汇交易公司 LMAX 开发。

性能测试：https://github.com/LMAX-Exchange/disruptor/wiki/Performance-Results

## 二、Disruptor 为什么这么快

### 2.1 无锁操作

生产数据消费数据都是通过申请序列，申请成功后才可以继续操作。而申请序列的操作时通过 CAS + LockSupport 完成的。

### 2.2 消除伪共享

通过填充数据方式来实现消除伪共享

#### 2.2.1 什么是伪共享

cpu 三级缓存架构如下

![cpu 三级缓存](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/disruptor.png)

thread1 和 thread2 读取数据会覆盖 cpu cache line

![伪共享](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/disruptor1.png)


#### 2.2.2 通过数据填充消除伪共享

通过填充数据，使数据长度恰好等于一个缓存行长度（64 字节 or 128 字节），这样数据占据整个缓存行，就不会被别的数据覆盖。

Disruptor 中的 Sequence 序列号对象，通过先后数据填充，变为 128 个字节，实现伪共享消除的。

``` java
class LhsPadding
{
    protected long p1, p2, p3, p4, p5, p6, p7;
}

class Value extends LhsPadding
{
    protected volatile long value;
}

class RhsPadding extends Value
{
    protected long p9, p10, p11, p12, p13, p14, p15;
}


public class Sequence extends RhsPadding
{
    static final long INITIAL_VALUE = -1L;
    private static final Unsafe UNSAFE;
    private static final long VALUE_OFFSET;
}
```

通过前置p1~p7，后置p9~p15填充缓存行，防止缓冲行共享。一般的处理器架构缓存行是64字节，但是有个处理器架构是128字节，所以采用前后填充，能够实现在所有处理器上消除伪共享。

![缓存行](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/disruptor2.png)

### 2.3 环形 buffer

内部采用数组存储数据，充分利用内存局部性原理。

只使用一个指针来表示可用数据，没有头尾指针。消除头尾指针竞争。各个生产者消费者只需要申请自己的序列号，就可以进行操作了。不存在竞争同一资源。

bufferSize 是 2 的 n 次幂，通过 sequence & (2^n -1) 来计算索引。

通过数据覆盖，不需要删除数据，无需 GC。

## 三、Disruptor 如何工作

### 3.1 消费者端

每个消费者都对应一个 ConsumerBarrier，消费者通过 ConsumerBarrier 与 Disruptor 交互。消费者通过 ConsumerBarrier 获取下一个可以消费的序列号，然后开始消费。比如消费者 A 当前消费的序列号是8，通过 ConsumerBarrier 获取下一个可消费的序列号是 12，那么消费者 A 可以批量消费序列号 9，10，11，12 的数据。

**消费者消费数据步骤：1.获取序列号，2.消费数据**

![消费者消费步骤](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/disruptor3.png)

### 3.2 生产者端

多个生产者对应一个 Sequencer，也就是说多个生产者共用一个序列号。

**生产者生产数据步骤：1.申请序列号，2.填充数据，3.发布**

生产者 A 和生产者 B **同时生产**数据，如下图：

![生产者1](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/disruptor4.png)

生产者 A **讯轮阻塞** 等待消费者 A，如下图：

![生产者2](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/disruptor5.png)

消费者 A **轮训非阻塞** 等待生产者 B，如下图：

![生产者3](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/disruptor6.png)

## 四、源码导读

### 4.1 核心类

https://github.com/LMAX-Exchange/disruptor/wiki/Introduction

ringbuff上有指针，每个消费者都维护自己的一个指针，生产者共用一个指针。指针是由 Sequencer类来控制的假设buffsize=8，如果消费者在消费id7，生产者将生产id15（15-buffsize=7），是同一个位置，生产者阻塞，如果生产者在生产id7，消费者在消费id7，消费者阻塞

![流程图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/162762019.png)

### 4.2 生产者端

#### 4.2.1 申请序号

调用 Sequencer#get ，直接看多生产者如果申请序号的

``` java
public long next(int n)
{
  if (n < 1)
  {
    throw new IllegalArgumentException("n must be > 0");
  }

  long current;
  long next;

  do
  {
    // 获取当前发布序号
    current = cursor.get();
    next = current + n;
		
    long wrapPoint = next - bufferSize;
    // gatingSequenceCache 这是 gatingSequence 的缓存，存入的是最小的消费者消费序列（有多个消费者）
    long cachedGatingSequence = gatingSequenceCache.get();
		// 生产者要覆盖未被消费的数据（生产者超过消费者一圈了）
    if (wrapPoint > cachedGatingSequence || cachedGatingSequence > current)
    {
      // 获取最小的消费者序列
      long gatingSequence = Util.getMinimumSequence(gatingSequences, current);

      if (wrapPoint > gatingSequence)
      {
        LockSupport.parkNanos(1); // TODO, should we spin based on the wait strategy?
        continue;
      }
			// 更新缓存
      gatingSequenceCache.set(gatingSequence);
    }
    else if (cursor.compareAndSet(current, next))
    {
      break;
    }
  }
  while (true);

  return next;
}
```

#### 4.2.2 写入数据

``` java
 public E get(long sequence)
 {
   return (E)entries[(int)sequence & indexMask];
 }
// dosomething
```

#### 4.2.3发布

``` java
public void publish(final long sequence)
{
  // 将待发布的序列设为可用，这样消费者就可以消费这个序列了
  setAvailable(sequence);
  waitStrategy.signalAllWhenBlocking();
}
```

### 4.3 消费者端

Disruptor#start 启动，会在线程池里启动 EventProcessor，每个 EventHandler 对应一个 EventProcessor

BatchEventProcessor 是 EventProcessor 的实现类，run方法里会轮训，是否有 event 可以被消费，如果可以就调用 EventHandler#onEvent 方法，触发消费者事件。

重点看 BatchEventProcessor#run 方法

``` java
public void run()
{
  // 状态设为启动，是一个AtomicBoolean
  if (!running.compareAndSet(false, true))
  {
    throw new IllegalStateException("Thread is already running");
  }
  // 清除中断
  sequenceBarrier.clearAlert();
	// 判断一下消费者是否实现了LifecycleAware ,如果实现了这个接口，那么此时会发送一个启动通知
  notifyStart();

  T event = null;
  long nextSequence = sequence.get() + 1L;
  try
  {
    while (true)
    {
      try
      {
        // 获取最大可用的序号，表示在之前的都可以安全消费
        final long availableSequence = sequenceBarrier.waitFor(nextSequence);

        while (nextSequence <= availableSequence)
        {
          event = dataProvider.get(nextSequence);
          eventHandler.onEvent(event, nextSequence, nextSequence == availableSequence);
          nextSequence++;
        }
				// 记录对应消费者消费到哪里
        sequence.set(availableSequence);
      }
      catch (final TimeoutException e)
      {
        notifyTimeout(sequence.get());
      }
      catch (final AlertException ex)
      {
        // 如果任务停止，就退出
        if (!running.get())
        {
          break;
        }
      }
      catch (final Throwable ex)
      {
        exceptionHandler.handleEventException(ex, nextSequence, event);
        sequence.set(nextSequence);
        nextSequence++;
      }
    }
  }
  finally
  {
    notifyShutdown();
    // 任务关闭
    running.set(false);
  }
}
```

消费者在消费时候，需要判断其最大可消费的序列号，这个最大可消费序列号是通过 SequenceBarrier#waitFor 方法来实现的

``` java
public long waitFor(final long sequence)
        throws AlertException, InterruptedException, TimeoutException
    {
    		// 判断是否中断，如果中断就抛出异常，这样上层捕捉，就可以停止 BatchEventProcessor
        checkAlert();
				// 根据不同的策略获取可用的序列
        long availableSequence = waitStrategy.waitFor(sequence, cursorSequence, dependentSequence, this);
				// 可用序列比申请的序列小，直接返回
        if (availableSequence < sequence)
        {
            return availableSequence;
        }
				// 如果是单生产者，直接返回 availableSequence；对于多生产者判断是否可用，不可用返回sequence-1
        return sequencer.getHighestPublishedSequence(sequence, availableSequence);
    }
```

## 五、参考

https://github.com/LMAX-Exchange/disruptor