---
title: ThreadLocal
date: 2019-03-20 20:22:41
tags: [spring,threadlocal]
categories: java进阶
---

## 目标

总结 ThreadLocal 实现原理，缺点，InheritableThreadLocal 原理，ThreadLocalRandom 中如何应用 ThreadLocal，Spring Bean 中如何 应用 ThreadLocal

## ThreadLocal

提供线程本地变量，创建一个ThreadLocal需要及时销毁，不然会造成内存泄露。

先看下类图：

![ThreadLocal类图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/leitu.png)

可知 Thread 类中有一个 threadLocals 和 inheritableThreadLocals 都是 ThreadLocalMap 类型的变量，而 ThreadLocalMap 是一个定制化的 Hashmap，默认每个线程中这个两个变量都为 null，只有当前线程第一次调用了 ThreadLocal 的 set 或者 get 方法时候才会进行创建。其 key 是 ThradLocal，value 是存放的数据。

每个线程本地数据不是存放在 ThreadLocal 里面，而是线程的 threadLocals 变量里。也就是说 ThreadLocal 类型的本地变量是存放到具体的线程内存空间的。

ThreadLocal 只是一个工具壳，他通过 set 方法将数据存放在线程的 threadLocals 变量里，通过 get 方法从线程的 thradLocals 里取数据。

### 注意点

ThreadLocal 变量时线程封闭的，子线程不继承父线程的数据。且创建了ThreadLocal 变量用后需要及时销毁，否则会造成内存泄露。

## InheritableThreadLocal

InheritableThreadLocal 继承自 ThreadLocal，提供了一个特性，子线程可以继承父线程的 ThreadLocal 变量。

先看下代码：

``` java
public class InheritableThreadLocal<T> extends ThreadLocal<T> {
    protected T childValue(T parentValue) {
        return parentValue;
    }

    ThreadLocalMap getMap(Thread t) {
       return t.inheritableThreadLocals;
    }

    void createMap(Thread t, T firstValue) {
        t.inheritableThreadLocals = new ThreadLocalMap(this, firstValue);
    }
}

```

可知 InheritableThreadLocal 就是讲 ThreadLocal 操作的 线程的 threadLocals 变量给成线程的 inheritableThreadLocals 变量，那么实现原理得从 Thread 来看。

在 Thread 类的 init 方法中有这样的代码：

``` java
if (parent.inheritableThreadLocals != null)
    this.inheritableThreadLocals =
        ThreadLocal.createInheritedMap(parent.inheritableThreadLocals);
```

可知，在线程创建的时候，如果 inheritableThreadLocals 变量不为空会复制给子线程，这样就保证了 InheritableThreadLocal 类能够继承父类的 ThreadLocal 变量（似乎叫 InheritableThreadLocal 变量更合适）

### InheritableThreadLocal 使用场景

比如存放用户登录信息的 threadlocal 变量，很有可能子线程中也需要使用用户登录信息，再比如一些中间件需要用统一的追踪 ID 把整个调用链路记录下来的情景。

## ThreadLocalRandom 中的应用

### Random 在高并发下的缺陷

先来看下 nextInt(int n) 的方法：
``` java
public int nextInt(int bound) {
    if (bound <= 0)
        throw new IllegalArgumentException(BadBound);
    // 根据老的种子生成新的种子 r 
    int r = next(31);
    int m = bound - 1;
    // 根据种子 r 计算随机数
    if ((bound & m) == 0)  // i.e., bound is a power of 2
        r = (int)((bound * (long)r) >> 31);
    else {
        for (int u = r;
             u - (r = u % bound) + m < 0;
             u = next(31))
            ;
    }
    return r;
}
```

根据老种子获取新种子的方法：
``` java
protected int next(int bits) {
    long oldseed, nextseed;
    // 是原子变量
    AtomicLong seed = this.seed;
    // 轮训 CAS 操作
    do {
        oldseed = seed.get();
        nextseed = (oldseed * multiplier + addend) & mask;
    } while (!seed.compareAndSet(oldseed, nextseed));
    return (int)(nextseed >>> (48 - bits));
}
```

根据上诉代码可知，生成一个随机数，需要先获取新种子，然后通过新种子来计算随机数。而获取新种子是存在并发问题的，因此 Random 的做法是将种子定义为**原子变量**，线程通过**轮训 CAS 操作**来得到新种子。这样虽然能保证线程安全，但是**在高并发下会造成大量线程进行自旋重试和无畏的 CAS 操作**。

### ThreadLocalRandom 来了

继承自 Random，先看下类图：
![Random类图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/leitu2.png)

ThreadLocalRandom 并没有维持一个原子变量种子，而是将每个线程的种子存放在线程的 threadLocalRandomSeed 变量中，ThreadLocalRandom 类像 ThreadLocal 类一样是一个工具类。值得注意的是 **threadLocalRandomSeed 是 long 类型，因为是线程封闭的**。

## Spring Request Scope 作用域 Bean 中 ThreadLocal 的使用

我们知道 Spring 可以在配置 Bean 的时候可以指定 scpoe 属性来指定该 Bean 的作用域，singleton、prototype、request、session 等。其中 request 作用域就是通过 ThreadLocal 来实现的。

一个 web 请求的简要时序图如下：
![时序图](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/liuchengtu.png)

每次发起 web 请求在 tomcat 中的 context（具体应用）前且在 host 匹配后，都会在 requestInitialized 方法中设置 RequestContextHolder 属性，在请求结束 requestDestroy 方法中会销毁。

setRequestAttributes 方法会设置属性到 ThreadLocal 变量，默认是不可继承的，可以设置为可继承，这样就会将属性保存到 InheritableThreadLocal 变量中。也就是说默认情况下，子线程访问不到存放在 RequestContextHolder 中的属性。

## 总结

本文通过循序渐进的方式，先讲解了 ThreadLocal 的简单使用，然后讲解了 ThreadLocal 的实现原理，并指出 ThreadLocal 不支持继承性；然后紧接着讲解了 InheritableThreadLocal 是如何补偿了 ThreadLocal 不支持继承的特性；然后讲解了 ThreadLocalRandom 是如何借鉴 ThreadLocal 的思想补充了 Random 的不足；最后简单的介绍了 Spring 框架中如何使用 ThreadLocal 实现了 Reqeust Scope 的 Bean。

## 补充

### ThreadLocalMap 采用线性探测法
ThreadLocalMap 内部是通过 "线性探测法" 来解决hash冲突的，不同于 HashMap 是通过链表法解决 hash 冲突。

ThreadLocalMap 采用 ThreadLocal 的弱引用作为 key。

**线性探测法**

就是在当前位置线性往后探测如果有空的位置就set

https://zhuanlan.zhihu.com/p/37004598

**拉链法与线程探测法优缺点**

拉链法不会产生堆积现象，平均查找长度较短。但相对于线性探测法较浪费空间

### 防止内存泄露的最后一道防线——弱引用

如果 ThreadLocalMap 采用的是强引用，这样引用 ThreadLocal 的对象被回收了，由于 ThreadLocal 一直被 ThreadLocalMap 强引用着而不能被回收，从而导致 Entry 内存泄露。

如果是弱引用，就算你不显示的调用 remove 方法，在 gc 执行的时候，如果一个对象只被弱引用着，就会无脑回收这个对象。就不会产生内存泄露。

但是日常开发中，还是要用完即删除，调用 remove 方法，会将 ThreadLocal 从 ThreadLocalMap 移除。

### 补充——ThreadLocal会造成内存泄露

按照前面所说，ThreadLocalMap 采用的是弱引用，这样ThreadLocal会被回收，但是会出现 null-key 的情况。如果线程存货周期较长，那么会存在这样的强引用关系 Thread-->ThreadLocalMap-->Entry-->Value，这条强引用链会导致Entry不会回收，Value也不会回收，但Entry中的Key却已经被回收的情况，造成内存泄漏。

ThreadLocal 的 get()、set()、remove() 方法调用的时候会清除掉线程 ThreadLocalMap 中所有Entry中Key为null的Value，并将整个 Entry 设置为null，利于下次内存回收


## 参考

Java 并发编程之美：并发编程高级篇之一

https://zhuanlan.zhihu.com/p/37004598
