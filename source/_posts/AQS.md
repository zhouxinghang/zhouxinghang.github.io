---
title: AQS相关
date: 2019-03-12 11:13:14
tags: [锁,源码分析,AQS,Lock,synchronized]
categories: 并发编程
---

## AQS 简单介绍

AbstractQueuedSynchronizer，抽象同步队列。是实现同步的基础组件，并发包中的锁都是基于 AQS 实现。

内部有一个 **state 变量**，用于表示一些状态信息，这个状态信息具体由实现类决定，比如一个 ReentrantLock 类这个 state 就表示获取锁的次数。

内部维持两个队列，**Sync Queue** 和 **Condition Queue**，Sync Queue 是一个双向 FIFO 链表，是锁的时候用到。而 Condition Queue 是条件队列，作为锁的等待条件时用到。

这个类使用到了**模板方法设计模式**：定义一个操作中算法的骨架，而将一些步骤的实现延迟到子类中。


## AQS

### AQS 类简单介绍

先看一下 AQS 的类图

![AQS 类图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/aqs.png)

AQS 是一个 FIFO 的双向队列，内部通过 tail 和 head 来记录队尾和队首，队列元素为 Node，状态信息为 state，通过内部类 ConditionObject 来结合锁实现线程同步

**Node 节点**：
Note 的属性 thread 来存储进入 AQS 的线程（竞争锁失败进入等待队列）；Node 节点内部 SHARED 表示是获取共享资源被阻塞挂起后放入 AQS 队列的，EXCLUSIVE 表示获取独占资源被阻塞后挂起放入到 AQS 队列的；prev 记录当前节点的前驱节点，next 记录当前节点的后续节点。

waitStatus 表示当前线程等待状态，分别为 CANCELLED（线程被取消），SIGNAL（线程需要被唤醒），CONDITION（线程在条件队列里面等待），PROPAGATE（释放共享资源时候需要通知其他节点），


**state 状态信息**：

AQS 中维持了一个单一的状态信息 state，可以通过 getState、setState 和 compareAndSetState 函数修改其值

* ReentrantLock：当前线程获取锁的次数
* ReentrantReadWriteLock：state 高16位表示读状态也就是**获取读锁的线程数**，低16位表示写状态也就是**获取写锁的次数**
* Semaphore：当前可用信号个数
* FutureTask：开始，运行，完成，取消
* CountDownlatch 和 CyclicBarrie：计数器当前的值

**ConditionObject 内部类**：

AQS 通过内部类 ConditionObject 来结合锁实现线程同步，ConditionObject 可以直接访问 AQS 内部变量（state 状态值和 Node 队列）。ConditionObject 是条件变量，每个条件变量对应一个条件队列（单向链表），线程调用条件变量的 await 方法后阻塞会放入到该队列，如类图，条件队列的头尾元素分别为 firstWaiter 和 lastWaiter。

### AQS 实现同步原理

AQS 通过操作 state 状态变量实现同步的操作。操作 state 分为共享模式和独占模式。

独占模式获取和释放锁方法为：

``` java
void acquire(int arg) 
void acquireInterruptibly(int arg) 
boolean release(int arg)
```

共享模式获取和释放锁方法为：

``` java
void acquireShared(int arg) 
void acquireSharedInterruptibly(int arg) 
boolean releaseShared(int arg)
```

**Interruptibly关键字的方法**：

带 Interruptibly 关键字的方法会对中断进行相应，也就是在线程调用 acquireInterruptibly（或 acquireSharedInterruptibly） 方法获取资源时或获取资源失败被挂起的时候，其它线程中断了该线程，那么该线程会抛出 InterruptedException 异常而返回。

**独占模式获取锁与共享模式获取锁区别**：

独占模式获取锁是与具体线程绑定的，比如独占锁 ReentrantLock，如果线程获取到锁，会通过 CAS 操作将 state 从0变为1并且将当前锁的持有者设为该线程。当该线程再次获取锁时发现锁的持有者为自己，就会将 state +1，当另外的线程尝试获取锁，发现当前锁持有者不是自己，会被放入到 AQS 队列并挂起。

共享模式获取锁是与具体线程不相关的，多个线程请求请求资源时候是通过 CAS 方式竞争获取的，也就是说 CAS 操作只要成功就 OK。比如 Semaphore 信号量，当一个线程通过 acquire() 方法获取一个信号量时候，会首先看当前信号量个数是否满足需要，不满足则把当前线程放入阻塞队列，如果满足则通过自旋 CAS 获取信号量。


#### 独占模式 acquire 源码分析

``` java
public final void acquire(int arg) {
        if (!tryAcquire(arg) &&
            acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
            selfInterrupt();
    }
```

这是一个模板方法,获取锁 tryAcquire(arg) 的具体实现定义在子类中。

获取到锁 tryAcquire 就直接返回，否则调用 addWaiter 将当前节点添加到等待队列末尾。

``` java
private Node addWaiter(Node mode) {
    // 将当前线程封装为 Node，设为独占模式
    Node node = new Node(Thread.currentThread(), mode);
    // Try the fast path of enq; backup to full enq on failure
    Node pred = tail;
    // 如果 tail 不为空，将 node 插入末尾
    if (pred != null) {
        node.prev = pred;
        // 可能多个线程同时插入，用 CAS 操作
        if (compareAndSetTail(pred, node)) {
            pred.next = node;
            return node;
        }
    }
    // 如果 tail 节点为空，或调用 CAS 操作将 当前节点设为 tail 节点失败
    enq(node);
    return node;
}

private Node enq(final Node node) {
    for (;;) {
        Node t = tail;
        // 可能多个线程同时插入，重新判断是否为空
        if (t == null) { // Must initialize
            if (compareAndSetHead(new Node()))
                tail = head;
        } else {
            node.prev = t;
            if (compareAndSetTail(t, node)) {
                t.next = node;
                return t;
            }
        }
    }
}
```

addWaiter 和 enq 方法是为了将当前线程 node 插入到队列末尾。插入成功后不会立即挂起当前线程，因为在 addWaiter 过程中前面的线程可能已经执行完。此时会调用自选操作 acquireQueued 让该线程尝试重新获取锁，如果获取锁成功就退出，否则继续。

``` java
 final boolean acquireQueued(final Node node, int arg) {
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {
            final Node p = node.predecessor();
            // 如果其前驱节点为头结点，尝试获取锁，将该节点设为头结点，然后返回
            if (p == head && tryAcquire(arg)) {
                // Called only by acquire methods
                setHead(node);
                p.next = null; // help GC
                failed = false;
                return interrupted;
            }
            // 如果获取锁失败，则判断是否需要挂起
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())
                interrupted = true;
        }
    } finally {
        if (failed)
            cancelAcquire(node);
    }
}
```

先尝试获取锁，失败再判断是否需要挂起，这个判断是通过它的前驱节点 waitStatus 确定的。

``` java
private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
    int ws = pred.waitStatus;
    if (ws == Node.SIGNAL)
        /*
         * This node has already set status asking a release
         * to signal it, so it can safely park.
         */
        return true;
    if (ws > 0) {
        /*
         * Predecessor was cancelled. Skip over predecessors and
         * indicate retry.
         */
        do {
            node.prev = pred = pred.prev;
        } while (pred.waitStatus > 0);
        pred.next = node;
    } else {
        /*
         * waitStatus must be 0 or PROPAGATE.  Indicate that we
         * need a signal, but don't park yet.  Caller will need to
         * retry to make sure it cannot acquire before parking.
         */
        compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
    }
    return false;
}
```

如果前驱节点的 waitStatus 为：

* SINGAL，其前驱节点将要被唤醒，该节点可以安全的挂起，直接返回 true
* \> 0，其前驱节点被取消，轮训将所有被取消的前驱节点都剔除，然后返回 false
* < 0，其前驱节点为 0 或 PROPAGATE，将前驱节点置为 SINGAL 表示自己将处于阻塞状态（下次判断时，会走 ws == Node.SIGNAL 的分支），然后返回 false。

返回 false，表示会重新执行 acquireQueued 方法，然后再重新检查前驱是不是头结点重新try一下什么的，也是之前描述的流程。

**获取独占锁过程总结**：

AQS的模板方法acquire通过调用子类自定义实现的tryAcquire获取同步状态失败后->将线程构造成Node节点(addWaiter)->将Node节点添加到同步队列对尾(addWaiter)->节点以自旋的方法获取同步状态(acquirQueued)。在节点自旋获取同步状态时，只有其前驱节点是头节点的时候才会尝试获取同步状态，如果该节点的前驱不是头节点或者该节点的前驱节点是头节点单获取同步状态失败，则判断当前线程需要阻塞，如果需要阻塞则需要被唤醒过后才返回。

#### 独占模式 release 源码分析

AQS 的 release 释放同步状态和 acquire 获取同步状态一样，都是模板方法，tryRealease 具体操作都由子类实现，父类 AQS 只是提供一个算法骨架。

``` java
public final boolean release(int arg) {
    if (tryRelease(arg)) {
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);
        return true;
    }
    return false;
}
```

如果释放成功，会解锁头节点的后续节点。

``` java
private void unparkSuccessor(Node node) {
    /*
     * If status is negative (i.e., possibly needing signal) try
     * to clear in anticipation of signalling.  It is OK if this
     * fails or if status is changed by waiting thread.
     */
    int ws = node.waitStatus;
    if (ws < 0)
        compareAndSetWaitStatus(node, ws, 0);

    /*
     * Thread to unpark is held in successor, which is normally
     * just the next node.  But if cancelled or apparently null,
     * traverse backwards from tail to find the actual
     * non-cancelled successor.
     */
    Node s = node.next;
    // 如果后续节点为空或是作废节点
    if (s == null || s.waitStatus > 0) {
        s = null;
        // 从末尾开始找合适的节点
        for (Node t = tail; t != null && t != node; t = t.prev)
            if (t.waitStatus <= 0)
                s = t;
    }
    // 唤醒
    if (s != null)
        LockSupport.unpark(s.thread);
}
```

如果 node 的后续节点不为空，且不是作废节点，就唤醒这个后续节点。否则从末尾开始找到合适的节点，如果找到便唤醒


### AQS 对于条件变量的支持

Object 类的 notify 和 wait 是配合 synchronized 内置锁（ObjectMonitor，每个对象都有一个对应的监视器锁）来实现线程间通信与协作的。而条件变量的 singal 和 await 是配合锁（基于 AQS 实现的锁）实现线程间同步的。

**一个条件变量实现线程同步的栗子**：

``` java
public class ConditionDemo {
    private static final  ExecutorService EXECUTOR_SERVICE = Executors.newFixedThreadPool(2);
    public static void main(String[] args) {
        ReentrantLock lock = new ReentrantLock();
        Condition condition = lock.newCondition();
        EXECUTOR_SERVICE.submit(new AwaitThread(lock, condition));
        EXECUTOR_SERVICE.submit(new SignalThread(lock, condition));
    }
}

class AwaitThread implements Runnable {
    private ReentrantLock lock;
    private Condition condition;

    public AwaitThread(ReentrantLock lock, Condition condition) {
        this.lock = lock;
        this.condition = condition;
    }

    @Override
    public void run() {
        try {
            lock.lock();
            System.out.println("begin wait");
            condition.await();
            System.out.println("end wait");
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            lock.unlock();
        }
    }
}

class SignalThread implements Runnable {
    private ReentrantLock lock;
    private Condition condition;

    public SignalThread(ReentrantLock lock, Condition condition) {
        this.lock = lock;
        this.condition = condition;
    }

    @Override
    public void run() {
        try {
            lock.lock();
            System.out.println("begin signal");
            condition.signal();
            System.out.println("end signal");
        } finally {
            lock.unlock();
        }
    }
}
```

一个 Lock 对象可以创建多个 Condition 条件变量。调用条件变量的 await 方法类似于 Object 的 wait 方法，会阻塞挂起当前线程，并释放锁，如果没有获取到锁就调用条件变量的 await 方法会抛出 java.lang.IllegalMonitorStateException 异常。

上述通过 lock.newConditio() 会在 AQS 内部声明一个 ConditionObject 对象，每个 ConditionObject 内部会维持一个条件队列，用于存放调用 await 方法而阻塞的线程。

**await 方法如下**：

``` java
public final void await() throws InterruptedException {
    if (Thread.interrupted())
        throw new InterruptedException();
    // 创建新的 node，并插入条件队列末尾
    Node node = addConditionWaiter();
    // 释放当前线程获取的锁
    int savedState = fullyRelease(node);
    int interruptMode = 0;
    // 调用 LockSupport.park 方法阻塞挂起当前线程
    while (!isOnSyncQueue(node)) {
        LockSupport.park(this);
        if ((interruptMode = checkInterruptWhileWaiting(node)) != 0)
            break;
    }
    if (acquireQueued(node, savedState) && interruptMode != THROW_IE)
        interruptMode = REINTERRUPT;
    if (node.nextWaiter != null) // clean up if cancelled
        unlinkCancelledWaiters();
    if (interruptMode != 0)
        reportInterruptAfterWait(interruptMode);
}
```

**signal 方法如下**：

``` java
public final void signal() {
    if (!isHeldExclusively())
        throw new IllegalMonitorStateException();
    Node first = firstWaiter;
    if (first != null)
        // Transfers a node from a condition queue onto sync queue.
        doSignal(first);
}

private void doSignal(Node first) {
    do {
        if ( (firstWaiter = first.nextWaiter) == null)
            lastWaiter = null;
        first.nextWaiter = null;
    } while (!transferForSignal(first) &&
             (first = firstWaiter) != null);
}
```

**一个锁对应一个 AQS 阻塞队列和多个条件变量，每个条件变量对应一个条件队列。**

![Lock 与 Condition](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/lockCondition.png)


### LockSupport 对于 AQS 阻塞和唤醒线程的支持

LockSupport 用来创建锁和其它同步类的基本线程阻塞原语，主要作用是挂起和唤醒线程。

LockSupport 类与每个使用它的线程都会关联一个许可证，默认调用 LockSupport 类方法的线程是不持有许可证的，LockSupport 类内部通过 UnSafe 类实现。先看下类图：

![LockSupport 类图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/lockSupport.png)

主要看私有变量 UNSAFE 和 parkBlockerOffset，和一些 park 和 unpark 方法。

#### UNSAFE

park unpark 都是由 Unsafe 类实现的，都是 native 方法

#### parkBlockerOffset

私有变量 parkBlockerOffset 保存 parkBlocker 的偏移量。parkBlocker 记录的是线程的阻塞者，用于线程监控和分系工具定为原因的。可以通过 getBlocker 来获取阻塞者。注意的是为了防止滥用，setBlocker 是私有方法。

**为什么不直接保存阻塞者，而用偏移量这样的方式保存阻塞者信息？**

仔细想想就能明白，这个parkBlocker就是在线程处于阻塞的情况下才会被赋值。线程都已经阻塞了，如果不通过这种内存的方法，而是直接调用线程内的方法，线程是不会回应调用的。

#### park 相关方法

如果调用 **park()** 的线程已经拿到了与 LockSupport 关联的许可证（调用 unpark 方法获取许可证），则调用 LockSupport.park() 会马上返回，否者调用线程会被禁止参与线程的调度，也就是会被阻塞挂起。

**parkNanos(long nanos)** 与其类似，如果没有拿到许可调用线程会被阻塞挂起 nanos 时间后在返回。

**parkUntil(long deadline)** 也一样

**park(Object blocker)** 会记录阻塞者到 parkBlocker，线程恢复后，会消除 parkBlocker

#### unpark(Thread thread) 方法

当一个线程调用了 unpark 时候，如果参数 thread 线程没有只有与 LockSupport 相关联的许可证，则让 thread 线程持有。如果 thread 线程之前调用了 park() 被挂起，则调用 unpark 后会被唤醒。


### 读写锁 ReentrantReadWriteLock 原理

state 变量高16位表示**获取读锁的线程数量**，低16位表示线程**获取写锁的可重入数量**，通过 **ThreadLocal 来保存线程获取读锁的可重入数量**。先看下 ReentrantReadWriteLock 的类图。

![ReentrantReadWriteLock 类图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/WX20190312-112625@2x.png)

其中，firstReader 记录第一个获取读锁的线程，firstReaderHoldCount 则记录第一个获取到读锁的线程获取读锁的可重入数。cachedHoldCounter 用来记录最后一个获取读锁的线程获取读锁的可重入次数：

``` java
static final class HoldCounter {
    int count = 0;
    // Use id, not reference, to avoid garbage retention
    final long tid = getThreadId(Thread.currentThread());
}
```

readHolds 是 ThreadLocal 变量，用于存放出去第一个获取读锁线程外的其它线程获取读锁的可重入次数和该线程的id。

``` java
static final class ThreadLocalHoldCounter
    extends ThreadLocal<HoldCounter> {
    public HoldCounter initialValue() {
        return new HoldCounter();
    }
}
```

#### 写锁的获取和释放

写锁通过 WriteLock 来实现，写锁是独占锁

**写锁的获取**：

获取写锁会调用 acquire 方法，前面讲到 acquire 是 AQS 的模板方法，其中 tryAcquire 方法在子类中实现，所以只需要了解 tryAcquire 具体实现。

``` java
protected final boolean tryAcquire(int acquires) {
    /*
     * Walkthrough:
     * 1. If read count nonzero or write count nonzero
     *    and owner is a different thread, fail.
     * 2. If count would saturate, fail. (This can only
     *    happen if count is already nonzero.)
     * 3. Otherwise, this thread is eligible for lock if
     *    it is either a reentrant acquire or
     *    queue policy allows it. If so, update state
     *    and set owner.
     */
    Thread current = Thread.currentThread();
    int c = getState();
    // 低16位数值
    int w = exclusiveCount(c);
    // 写锁或读锁被某些线程获取
    if (c != 0) {
        // (Note: if c != 0 and w == 0 then shared count != 0)
        // w=0 说明有线程获取了读锁，w！=0 且当前线程不是写锁拥有者（W!=0 表示获取了写锁）
        if (w == 0 || current != getExclusiveOwnerThread())
            return false;
        // 可重入数量大于最大值
        if (w + exclusiveCount(acquires) > MAX_COUNT)
            throw new Error("Maximum lock count exceeded");
        // Reentrant acquire
        setState(c + acquires);
        return true;
    }
    // 读写锁都未被获取
    if (writerShouldBlock() ||
        !compareAndSetState(c, c + acquires))
        return false;
    setExclusiveOwnerThread(current);
    return true;
}
```

writerShouldBlock 方法对于非公平锁，是直接返回false，这样就会走 CAS 操作，与别的所有线程一起竞争，也就是后来的线程与先来的线程一起“插队”竞争。writerShouldBlock 方法对于公平锁，会调用 hasQueuedPredecessors 会判断是否有前驱节点，如果有则直接放回放弃进竞争，毕竟别人先来的要公平。

**写锁的释放**：

释放写锁会调用 release 方法，release 是 AQS 的模板方法，tryRelease 由子类实现，我们来看tryRelease。

``` java
protected final boolean tryRelease(int releases) {
    // 判断是否是写锁拥有者
    if (!isHeldExclusively())
        throw new IllegalMonitorStateException();
    // 获取释放锁后的 可重入 值
    int nextc = getState() - releases;
    boolean free = exclusiveCount(nextc) == 0;
    // 如果可重如值为0，就释放锁
    if (free)
        setExclusiveOwnerThread(null);
    // 写锁只有一个线程，不需要 CAS 操作
    setState(nextc);
    return free;
}tryAcquireShared
```

#### 读锁的获取和释放

读锁通过 ReadLock 来实现，读锁是共享锁。

**读锁的获取**：

调用 AQS 的 acquireShared 方法，内部调用 ReentrantReadWriteLock 中的 Sync 重写的 tryAcquireShared 方法。

``` java
protected final int tryAcquireShared(int unused) {
    /*
     * Walkthrough:
     * 1. If write lock held by another thread, fail.
     * 2. Otherwise, this thread is eligible for
     *    lock wrt state, so ask if it should block
     *    because of queue policy. If not, try
     *    to grant by CASing state and updating count.
     *    Note that step does not check for reentrant
     *    acquires, which is postponed to full version
     *    to avoid having to check hold count in
     *    the more typical non-reentrant case.
     * 3. If step 2 fails either because thread
     *    apparently not eligible or CAS fails or count
     *    saturated, chain to version with full retry loop.
     */
    Thread current = Thread.currentThread();
    int c = getState();
    // 如果写锁被获取，且不是当前线程
    if (exclusiveCount(c) != 0 &&
        getExclusiveOwnerThread() != current)
        return -1;
    // 获取了读锁的线程数，别搞成是可重入数量
    int r = sharedCount(c);
    // 尝试获取读锁，多个线程只有一个成功，不成功的会进入下面的 fullTryAcquireShared 方法
    if (!readerShouldBlock() &&
        r < MAX_COUNT &&
        compareAndSetState(c, c + SHARED_UNIT)) {
        // 第一个获取读锁
        if (r == 0) {
            firstReader = current;
            firstReadeHoldCount = 1;
        // 是第一个获取读锁的线程
        } else if (firstReader == current) {
            firstReaderHoldCount++;
        } else {
            HoldCounter rh = cachedHoldCounter;
            // 将获取到读锁的当前线程和可重入数记录到 cachedHoldCounter 中
            if (rh == null || rh.tid != getThreadId(current))
                cachedHoldCounter = rh = readHolds.get();
            // cachedHoldCounter 为当前线程，将其保存到 readHolds 中
            else if (rh.count == 0)
                readHolds.set(rh);
            rh.count++;
        }
        return 1;
    }
    // 自旋 CAS 获取读锁
    return fullTryAcquireShared(current);
}
```

readerShouldBlock 方法会判断是否需要阻塞，在公平锁和非公平锁有不同的实现。

在**非公平锁**下，如果同步等待队列中有获取写锁的线程在排队，则获取读锁的该线程会阻塞，否则直接尝试获取读锁。

``` java
static final class NonfairSync extends Sync {
    final boolean readerShouldBlock() {
        return apparentlyFirstQueuedIsExclusive();
    }
}

final boolean apparentlyFirstQueuedIsExclusive() {
    Node h, s;
    return (h = head) != null &&
        // AQS 第一个 node 是虚拟节点
        (s = h.next)  != null &&
        !s.isShared()         &&
        s.thread != null;
}
```

在**公平锁**下，如果同步队列中有其他线程在排队，则获取读锁的该线程会阻塞，这里和写锁是一样的，先来后到~

``` java
static final class FairSync extends Sync {
    final boolean readerShouldBlock() {
        return hasQueuedPredecessors();
    }
}
```

**读锁的释放**：

直接看 tryReleaseShared 方法

``` java
protected final boolean tryReleaseShared(int unused) {
    Thread current = Thread.currentThread();
    // 先 firstReader 再 cachedHoldCounter 最后 readHolds
    if (firstReader == current) {
        // assert firstReaderHoldCount > 0;
        if (firstReaderHoldCount == 1)
            firstReader = null;
        else
            firstReaderHoldCount--;
    } else {
        HoldCounter rh = cachedHoldCounter;
        if (rh == null || rh.tid != getThreadId(current))
            rh = readHolds.get();
        int count = rh.count;
        // 为0 记得在 ThreadLocal 中 remove
        if (count <= 1) {
            readHolds.remove();
            if (count <= 0)
                throw unmatchedUnlockException();
        }
        --rh.count;
    }
    // 轮训 CAS 操作，将状态 state 更新
    for (;;) {
        int c = getState();
        int nextc = c - SHARED_UNIT;
        if (compareAndSetState(c, nextc))
            // Releasing the read lock has no effect on readers,
            // but it may allow waiting writers to proceed if
            // both read and write locks are now free.
            return nextc == 0;
    }
}
```

#### 锁降级

锁降级：写锁变成读锁。锁升级：读锁变成写锁。

同一线程在没有释放读锁下去申请写锁，会阻塞，ReentrantReadWriteLock 不支持锁升级。下面代码会阻塞：

``` java
ReadWriteLock rtLock = new ReentrantReadWriteLock();
rtLock.readLock().lock();
System.out.println("get readLock");
rtLock.writeLock().lock();
System.out.println("blocking");
```

ReentrantReadWriteLock支持锁降级，如果线程先获取写锁，再获得读锁，再释放写锁，这样写锁就降级为读锁了。

``` java
ReadWriteLock rtLock = new ReentrantReadWriteLock();
rtLock.writeLock().lock();
System.out.println("get writeLock");
rtLock.readLock().lock();
System.out.println("get readLock");
rtLock.writeLock().unlock();
System.out.println("unWriteLock");
```

#### 一些疑问

1.ReadLock 既然有了 readHolds 这个 ThreadLocal 变量，为什么还要额外的添加 firstReader 和 cachedHoldCounter 呢？

因为 ThreadLocal 变量内部是Map，这样比直接 get 一个变量是要要相对耗时的。在 fullTryAcquireShared 方法中也是先判断 firstReader 再判断 cachedHoldCounter 然后再在 readHolds 中获取的，或许 Doug Lea 大佬认为 第一个获取读锁的线程后续也大概是这个线程继续获取读锁的。而且这个命名 cachedHoldCounter 也已经说明一切。

2.读锁中判断是否需要阻塞 readerShouldBlock 方法，非公平锁的实现，为什么需要判断头结点是否是获取写锁而排队呢？

看注释是为了避免无限期的写锁饥饿


## synchronized 与 lock 的区别

synchronized 是通过 Monitor 监视器锁实现，而 Lock 是通过 AQS 实现。在 jdk6 之前，synchronized 是一个重量级锁。


## 一些疑问

### 为什么 AQS 需要一个虚拟 head 节点

每个节点都需要根据其前置节点 waitStatus 状态是 SINGAL 来唤醒自己，为了防止重复唤醒。但是第一个节点是没有前置节点，所以需要一个虚拟节点。



## 参考

java 并发编程之美（三）

[\[java1.8源码笔记\]ReentrantReadWriteLock详解](https://luoming1224.github.io/2018/03/01/%5Bjava1.8%E6%BA%90%E7%A0%81%E7%AC%94%E8%AE%B0%5DReentrantReadWriteLock%E8%AF%A6%E8%A7%A3/)

https://www.jianshu.com/p/9d379adba98c

https://www.jianshu.com/p/396d8c5ba4c4

https://zhuanlan.zhihu.com/p/27134110

https://juejin.im/post/5ae755606fb9a07ab97942a4