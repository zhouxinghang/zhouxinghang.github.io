---
title: java常量池
date: 2019-03-13 19:46:20
tags: [jvm]
categories: java基础
---

## 概述

java 包括三种常量池，分别是 字符串常量池、Class 常量池（也叫常量池表）和运行时常量池。

## 字符串常量池（String Pool）

String Pool 是 JVM 实例全局共享的，而 Runtime Constant Pool 是每个类都有一个。

JVM 用一个哈希表记录对常量池的引用。

String Pool 在 JDK1.7 之前是存放在方法区中的，JDK1.7 移入到堆中。可以测试下往List中无限放入String，看jdk各个版本的异常信息。jdk6是PermGen Space内存溢出，jdk7和8都是Java heap space内存溢出。

## 常量池表（Constant Pool Table）

为了让 java 语言具有良好的跨平台性，java 团队提供了一种可以在所有平台上使用的中间代码——字节码（byte code），字节码需要在虚拟机上运行。像 Groovy、JRuby、Jython、Scala等，也会编译成字节码，也能够在 Java 虚拟机上运行。

java 文件会编译成 Class 文件，ClassClass 文件包含了 Java 虚拟机指令集和符号表以及其他辅助信息。Class文件中除了包含类的版本、字段、方法、接口等描述信息外，还有一项信息(constant pool table)，用于存放编译器生成的各种字面量(Literal)和符号引用(Symbolic References)。也就是说常量池表示属于 Class 字节码文件中的一类结构化数据，Class 文件内容如下

![Class 文件结构](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/5E8BFA30-24F1-4A65-B8DD-A7506D761CD4.png)

举个栗子。

一个 HelloWord.java 文件

``` java
public class HelloWord {
    public static void main(String[] args) {
        String s = "helloword";
    }
}
```

会编译成 HelloWord.class 文件，通过反编译命令 `javap -v  HelloWorld.class` 可以查看其内容。

``` java
Classfile /Users/zhouxinghang/workspace/study/target/classes/com/zxh/study/test/HelloWord.class
  Last modified 2019-3-13; size 465 bytes
  MD5 checksum 3a7da1e8436a92ff3dacb4f45d30e7d9
  Compiled from "HelloWord.java"
public class com.zxh.study.test.HelloWord
  minor version: 0
  major version: 52
  flags: ACC_PUBLIC, ACC_SUPER
Constant pool:
   #1 = Methodref          #4.#20         // java/lang/Object."<init>":()V
   #2 = String             #21            // helloword
   #3 = Class              #22            // com/zxh/study/test/HelloWord
   #4 = Class              #23            // java/lang/Object
   #5 = Utf8               <init>
   #6 = Utf8               ()V
   #7 = Utf8               Code
   #8 = Utf8               LineNumberTable
   #9 = Utf8               LocalVariableTable
  #10 = Utf8               this
  #11 = Utf8               Lcom/zxh/study/test/HelloWord;
  #12 = Utf8               main
  #13 = Utf8               ([Ljava/lang/String;)V
  #14 = Utf8               args
  #15 = Utf8               [Ljava/lang/String;
  #16 = Utf8               s
  #17 = Utf8               Ljava/lang/String;
  #18 = Utf8               SourceFile
  #19 = Utf8               HelloWord.java
  #20 = NameAndType        #5:#6          // "<init>":()V
  #21 = Utf8               helloword
  #22 = Utf8               com/zxh/study/test/HelloWord
  #23 = Utf8               java/lang/Object
{
  public com.zxh.study.test.HelloWord();
    descriptor: ()V
    flags: ACC_PUBLIC
    Code:
      stack=1, locals=1, args_size=1
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return
      LineNumberTable:
        line 7: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       5     0  this   Lcom/zxh/study/test/HelloWord;

  public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=1, locals=2, args_size=1
         0: ldc           #2                  // String helloword
         2: astore_1
         3: return
      LineNumberTable:
        line 9: 0
        line 10: 3
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       4     0  args   [Ljava/lang/String;
            3       1     1     s   Ljava/lang/String;
}
```

### 字面量（literal）

>在计算机科学中，字面量（literal）是用于表达源代码中一个固定值的表示法（notation）。几乎所有计算机编程语言都具有对基本值的字面量表示，诸如：整数、浮点数以及字符串；而有很多也对布尔类型和字符类型的值也支持字面量表示；还有一些甚至对枚举类型的元素以及像数组、记录和对象等复合类型的值也支持字面量表示法。

上述是计算机科学对字面量的解释，在 Java 中，字面量包括：1.文本字符串 2.八种基本类型的值 3.被声明为 final 的常量等。

字面量只可以右值出现。如 `String s = "helloword"`，s 为左值，helloword 为右值，helloword 为字面量。

### 符号引用（Symbolic References）

符号引用是编译原理的概念，1是相对于直接引用来说的。在 Java中，符号引用包括：1.类和方法的全限定名 2.字段的名称和描述符 3.方法的名称和描述符。

### 常量池表的作用

常量池表（Class 常量池）是 Class 文件的资源仓库，保存了各种常量。

在《深入理解Java虚拟机》中有这样的描述：

>Java代码在进行Javac编译的时候，并不像C和C++那样有“连接”这一步骤，而是在虚拟机加载Class文件的时候进行动态连接。也就是说，在Class文件中不会保存各个方法、字段的最终内存布局信息，因此这些字段、方法的符号引用不经过运行期转换的话无法得到真正的内存入口地址，也就无法直接被虚拟机使用。当虚拟机运行时，需要从常量池获得对应的符号引用，再在类创建时或运行时解析、翻译到具体的内存地址之中。关于类的创建和动态连接的内容，在虚拟机类加载过程时再进行详细讲解。

## 运行时常量池（Runtime Constant Pool）

* JVM 运行时内存中方法区的一部分，所以也是全局共享的，是运行时的内容
* 运行时常量池相对于 Class 常量池一大特征就是其具有动态性，Java 规范并不要求常量只能在运行时才产生，也就是说运行时常量池中的内容并不全部来自 Class 常量池，Class 常量池并非运行时常量池的唯一数据输入口；在运行时可以通过代码生成常量并将其放入运行时常量池中
* 同方法区一样，当运行时常量池无法申请到新的内存时，将抛出 OutOfMemoryError 异常。
* 这部分数据绝大部分是随着 JVM 运行，从常量池表转化而来，每个 Class（不是 Java 对象） 都对应一个运行时常量池。（上面说绝大部分是因为：除了Class 中常量池内容，还可能包括动态生成并加入这里的内容）

## 为什么 Java 需要设计常量池，而 C 没有？

在 C/C++ 中，编译器将多个编译器编译的文件链接成一个可执行文件或 dll 文件，在链接阶段，符号引用就解析为实际地址。而 java 中这种链接是在程序运行时动态进行的。

jvm 在栈帧(frame) 中进行操作数和方法的动态链接(link)，为了便于链接，jvm 使用常量池来保存跟踪当前类中引用的其他类及其成员变量和成员方法。

当一个 java class 被编译时，所有的变量和方法都装载到 Class 常量池作为一个符号引用。JVM 实现何时去解析符号引用，可以发生在类加载后的验证步骤称为静态解析，也可以发生在第一次使用的时候称为延迟解析。

![java 常量池](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/49AE0FEB-FECE-40D0-BF46-6CF0E8D0B1C6.png)


## 参考

https://blog.csdn.net/u010297957/article/details/50995869

https://blog.csdn.net/luanlouis/article/details/39960815

http://blog.jamesdbloom.com/JVMInternals.html