---
title: protobuf 安装使用
date: 2019-04-30 21:40:30
tags: [protobuf, 序列化]
categories: javaWeb
---

## 安装

* 官网下载 https://github.com/protocolbuffers/protobuf/releases
* 解压，cd 到目录下
* ./configure
* make
* make check
* sudo make install
* which protoc
* protoc --version

## 使用

### 编写proto文件（idl文件）
一个名为 Person.proto文件如下：
```
syntax="proto3"; 
option java_package = "org.serialization.protobuf.quickstart";   
option java_outer_classname = "PersonProtobuf";   
message Person  {   
  int32 age = 1;
  string name = 2;
} 
```

### 编译

使用 protoc 编译器，将 proto 文件编译成 java 文件

```
protoc --java_out=./ Person.proto
```

### 序列化调用

引入 maven 依赖

``` xml
<dependency>
    <groupId>com.google.protobuf</groupId>
    <artifactId>protobuf-java</artifactId>
    <version>3.1.0</version>
</dependency>
```

