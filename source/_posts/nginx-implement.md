---
title: nginx实现原理
date: 2019-03-30 20:37:47
tags: [nginx]
categories: javaWeb
---

## 简单理解 Nginx

nginx 是静态 web 服务器，意思是 engine x。并发量高，


## Nginx 事件驱动模型

事件驱动模型是 Nginx 服务器保障完整可用功能和具有良好性能的重要机制之一

### 事件驱动模型概述

包括事件收集器、事件发送器和事件处理器。

事件收集器，专门负责收集所有事件。例如用户的鼠标点击事件和键盘输入事件。

事件发送器将收集到的事件分发到各个目标对象。目标对象就是事件处理器的位置。

事件处理器负责具体事件的响应，它往往要到实现阶段才能完全确定。

Windows 系统就是基于事件驱动模型设计的典型案例，一个窗口就是时间发送器的目标对象。

### nginx 事件驱动模型 

“事件发送器”每传递一个请求，“目标对象”就将其放入到待处理事件列表，使用非阻塞 I/O 方式调用“事件处理器”来处理请求。

大多数网络服务器采用这种方式，逐渐形成了所谓的“事件驱动处理库”。

事件驱动处理库又叫多路 I/O 复用方法，常见的包括 select 模型、pull 模型 和 epoll 模型。

### select 模型

文件描述符有3类，分别是write、read和Exception。获取这三个 set 集合，有空间限制，最多1024个。轮询所有set集合，判断有事件发生的描述符

windows 和 linux 都有

### poll 模型

获取一个 链表的头头结点，轮询set集合，判断有事件发生的描述符

windows 没有

### epoll 模型

select、poll需要轮询，效率低。将描述符交给内核处理，如果就事件发生，就通知事件处理器

## Nginx 服务器架构

![服务器架构](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/B8F55598-8252-41BF-9CAD-9F3B9D9A7D27.png)

大致分为主进程、工作进程、后端服务器和缓存。

### 主进程

* 配置文件解析
* 数据初始化
* 模块配置注册
* 信号处理 
* 网络监听，建立、绑定和关闭 Socket
* 工作进程生成（fork）和管理

### 工作进程

负责模块调用和请求处理

* 接受客户端请求
* 模块调用，将请求一次放入到各个模块过滤
* IO 调用，请求转发后端服务器
* 结果返回，响应客户端请求
* 数据缓存，访问缓存索引，查询调用索引
* 响应主程序请求，重启、升级退出等

### 缓存索引重建和管理进程

缓存索引重建 Cache loader，缓存管理 Cache manager

缓存索引重建进程，是在内存中建立缓存索引单元，缓存是存放在本地磁盘的

缓存管理进程负责判断索引单元是否过期

### 后端服务器

将请求转发到后端服务器，实现反向代理和复杂均衡

### 缓存

为实现高性能，采用缓存机制，将应答数据缓存到本地


## 参考
《Nginx 高性能 Web 服务器详解》

[Linux IO模式及 select、poll、epoll详解 - 人云思云 - SegmentFault 思否](https://app.yinxiang.com/shard/s47/nl/20420480/b3b2a11a-f9af-4df4-9eee-121945eff0c1/)

https://martinguo.github.io/blog/2016/08/30/Nginx/