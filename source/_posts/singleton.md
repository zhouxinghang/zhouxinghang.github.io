---
title: 单例模式
date: 2019-04-13 20:43:22
tags: [设计模式, 源码]
categories: java基础
---

## 饿汉式单例

类加载立即初始化，绝对线程安全，不存在访问安全问题。Spring IOC 容器 ApplicationContext 就是一个饿汉式单例。

优点：没有任何加锁，执行效率高，用户体验好

缺点：类加载就初始化，浪费空间

简单实例：

``` java
public class HungrySingleton {
    /** 也可以放在静态代码块中 */
    private static final HungrySingleton HUNGRY_SINGLETON = new HungrySingleton();
    
    private HungrySingleton() {}

    public static HungrySingleton getInstance() {
        return HUNGRY_SINGLETON;
    }
}
```

## 懒汉式单例

需要时才加载

### 通过 double-check 实现：

``` java
public class LazyDoubleCheckSingleton {
    // 需要用 volatile 修饰保证可见性和重排序
    private static volatile LazyDoubleCheckSingleton lazy;

    private LazyDoubleCheckSingleton() {}

    public static LazyDoubleCheckSingleton getInstance() {
        if (lazy == null) {
            synchronized (LazyDoubleCheckSingleton.class) {
                if (lazy == null) {
                    // 1.分配内存给对象
                    // 2.初始化对象
                    // 3.lazy 指向该对象
                    lazy = new LazyDoubleCheckSingleton();
                }
            }
        }
        return lazy;
    }
}

```

### 通过静态内部类实现：

double-check 方法需要加锁，对程序性能有一定影响，用静态内部类实现更好

``` java
/**
 * @author zhouxinghang
 * @date 2019-05-16
 * 外部类初次加载，会初始化静态变量、静态代码块、静态方法，但不会加载内部类和静态内部类。
 * 实例化外部类，调用外部类的静态方法、静态变量，则外部类必须先进行加载，但只加载一次。
 * 直接调用静态内部类时，外部类不会加载。
 */
public class LazySingleton {

    private LazySingleton(){}

    /**
     * final 保证方法不被重写
     * @return
     */
    public static final LazySingleton getInstance() {
        return LazySingletonHolder.LAZY_SINGLETON;
    }

    private static class LazySingletonHolder {

        private static final LazySingleton LAZY_SINGLETON = new LazySingleton();
    }
}
```

## 单例模式的破坏

### 反射破坏单例模式

尽管构造方法加了 private 修饰，但是可以通过反射调用构造方法，因此对构造方法加以限制，重复创建直接抛出异常。

以上述 LazySingleton 为例：

``` java
private LazySingleton(){
    // 如果通过反射来创建实例，就抛出异常
    if (LazySingletonHolder.LAZY_SINGLETON != null) {
        throw new RuntimeException("不允许创建多个不同实例");
    }
}
```

### 序列化破坏单例模式

在序列化操作时，反序列化后的对象会重新分配内存空间，即重新创建，如果目标是单例对象，就会破坏单例模式。

对此，我们只需要增加 readResolve() 方法即可。以上述 LazySingleton 为例，修改如下：

``` java
public class LazySingleton implements Serializable {

    private LazySingleton(){
        // 如果通过反射来创建实例，就抛出异常
        if (LazySingletonHolder.LAZY_SINGLETON != null) {
            throw new RuntimeException("不允许创建多个不同实例");
        }
    }

    /**
     * final 保证方法不被重写
     * @return
     */
    public static final LazySingleton getInstance() {
        return LazySingletonHolder.LAZY_SINGLETON;
    }

    /**
     * 保证反序列化还是原对象
     * @return
     */
    private Object readResolve() {
        return LazySingletonHolder.LAZY_SINGLETON;
    }

    private static class LazySingletonHolder {

        private static final LazySingleton LAZY_SINGLETON = new LazySingleton();
    }
}
```

至于为什么，需要看 JDK 序列化源码。ObjectInputStream 类的 readObject() -> readObject0() -> readOrdinaryObject() -> invokeReadResolve()。invokeReadResolve 代码如下：

![invokeReadResolve](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/71BF431A-33F0-4C49-A683-69AF7B27BDFE.png)

而 readResolveMethod 是在在私有方法 ObjectStreamClass() 中赋值的，代码如下：

![readResolveMethod](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/2143B7C0-E237-45EB-8D0D-FA667EC34717.png)

可见的，如果被序列化的类定义了 readResolve() 方法，就会调用该方法实现反序列化。

增加 readResolve() 方法可以防止单例模式被破坏，但是在 readOrdinaryObject() 方法中还是会创建一个新对象的，只不过返回的是readResolve() 方法返回值。具体代码如下：

![创建一个新对象](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/351EE59B-F579-4B54-BE81-50C017D19F31.png)

注册式单例可以避免这个问题

## 注册式单例

注册式单例又称为登记式单例，就是将每一个实例都登记到某一个地方，使用唯一的标 识获取实例。注册式单例有两种写法：一种为容器缓存，一种为枚举登记。枚举单例也是《Effective Java》书中推荐的一种单例实现写法

### 枚举单例

``` java
public enum  EnumSingleton {
    INSTANCE;

    private Object date;

    public Object getDate() {
        return date;
    }

    public void setDate(Object date) {
        this.date = date;
    }

    public static EnumSingleton getInstance() {
        return INSTANCE;
    }
}
```

通过反编译发现枚举类是通过静态代码块实现的饿汉式单例模式，反编译代码如下：

``` java
static
{
    INSTANCE = new EnumSingleton("INSTANCE", 0);
    $VALUES = (new EnumSingleton[] {
        INSTANCE
    });
}
```

枚举缓存既不会被序列化破坏，也不会被反射破坏。

对于序列化，在 ObjectInputStream 类中 readEnum() 方法里，发现枚举类型是通过类名和 Class 对象类找到唯一的枚举对象，代码如下：

![readEnum](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/11AC67F5-4A3E-427F-A758-9C7AA9A20444.png)

对于反射，Constructor 类中的 newInstance() 方法对于枚举类，直接抛出异常：

![newInstance](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/9286BD38-C4BA-468A-A523-B6EAD2569951.png)

### 容器缓存单例

可以看看 Spring 容器式单例实现：

![Spring容器](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/31EC471D-8239-49AC-88B9-BA5C538D97D7.png)

