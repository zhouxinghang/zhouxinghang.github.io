---
title: docker基础
date: 2019-04-09 20:59:33
tags: [javaWeb, docker]
categories: javaWeb
---

## Docker 简介

### 什么是 Docker

Docker 是 dotCloud 公司创立，go 语言编写，基于 Ubuntu 开发。基于 Linux 内核的 cgroup，namespace，以及 AUFS 类的 Union FS 等技术，对进程进行封装隔离，属于**操作系统层面的虚拟化技术**。隔离的进程独立于宿主和隔离的其他进程，也其曾为容器。

传统的虚拟机技术是虚拟一套硬件出来，在其上运行一个完整操作系统，在该系统上再运行所需应用进程。而容器是直接运行在宿主机的内核，没有进行硬件虚拟。因此容器比传统虚拟机更为轻便。

![虚拟机架构](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/ECE81376-BCEF-4910-9912-C25DED99496E.png)

![docker 架构](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/08B03E00-B63F-48C3-874B-A9BB84CF7339.png)


### 为什么要使用 Docker

#### 更高效利用系统资源

不需要硬件虚拟化，不需要运行完整 OS

#### 更快速的启动时间

直接运行于宿主内核，做到秒级、甚至毫秒级启动

#### 一致的运行环境

提供了除内核外完整的运行时环境

#### 高效部署扩容

#### 对比传统虚拟机总结

|   特性     |   容器    |   虚拟机   |
| :--------   | :--------  | :---------- |
| 启动       | 秒级      | 分钟级     |
| 硬盘使用   | 一般为 `MB` | 一般为 `GB`  |
| 性能       | 接近原生  | 弱于       |
| 系统支持量 | 单机支持上千个容器 | 一般几十个 |


## Docker 架构

docker 采用 C/S 架构，Client 通过结构与 Server 进程通信实现容器的构建，运行和发布

Client 和 Server 可以运行在同一台机器，也可以通过跨主机实现远程通信

![docker 操作流程](https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/8FC69242-461F-4292-9D12-6E427DABE064.png)


| 组件 | 描述 |
| --- | --- |
| 镜像（Images） | 用于创建 Docker 容器的模板 |
| 容器（Container） | 独立运行的一个或一组应用 |
| 客户端（Client） | 通过命令行或其他工具调用 Docker API |
| 主机（Host） | 一个宿主机用于执行 Docker 守护进程和容器 |
| 注册服务器（Registry） | 用于保存镜像，类似于 git 厂库。Docker Hub(https://hub.docker.com) 提供了庞大的镜像集合供使用。 |

### 镜像 image

操作系统分为内核和用户控件，对于 Linux 而言，内核启动后，会挂载 root 文件系统为其用户空间提供支持。而 Docker Image，就相当于一个 root 文件系统。

Docker Image 是一个特殊的文件系统，包好了提供容器运行所需的程序、库、资源、配置等文件外，还包括一些配置参数信息（如匿名卷、环境变量、用户等）。镜像不包含任何动态数据，其内容在构建后不会改变。

#### 分层存储

Docker Image 不是 ISO 那样的打包文件，它采用 Union FS 技术，将其设计为分层存储的架构。后一层依赖于前一层，如果需要 update 只需要创建一个新的层。这有点类似于 git 版本管理，每一层就是一个 git commit。

### 容器 container

镜像和容器就像面向对象程序中的类和实例对象。镜像是静态定义，容器是镜像运行时的实体。容器可以被创建、启动、停止、删除、暂停等。

容器 Container 实质是进程，与宿主进程不同，容器进程运行于属于自己独立的 **namespace**。因此容器拥有自己独立的 root 文件系统、网络配置、进程空间甚至自己的用户 ID 空间。

每个容器运行时，以镜像为基础层，在其上创建一个容器的存储层，为容器运行时读写而准备的存储层为**容器存储层**。容器存储层的生命周期和容器一致。容器存储层的数据也会随着容器的删除而删除。

按照 Docker 最佳实践要求，容器不应该像其容器存储层写入任务数据，容器存储层要**保持无状态化**。所有文件的写入都应该使用数据卷（Volume）、或者绑定宿主目录，在这些位置的读写会跳过容器存储层，直接对宿主（或网络存储）发起读写，其性能和稳定性更高。

使用数据卷，容器删除或重新运行，数据不会丢失。

#### namespace

**命名空间**是 Linux kernel 的功能，实现一个进程集合只能访问一个资源集合，实现资源和进程的分区，保证其相互独立。

命名空间是实现 Linux container 的基础。

### 仓库 repository

Docker Repository 用于保存镜像，可以理解为代码控制中的代码仓库。Docker 仓库也分为公有和私有，公有是 Docker Hub

### 注册服务器 Registry

集中存储分发镜像的服务，一个 Docker Registry 包含多个仓库 Repository，每个仓库包含多个**标签 Tag**，每个 标签对应一个镜像

## Docker 实现原理

### 命名空间 namespace

命名空间是 Linux 提供的用于分离进程树、网络接口、挂载点以及进程间通信等资源的方法。

### 控制组 cgroups

命名空间无法提供物理资源的隔离，比如 CPU 和内存，Linux 的控制组能够为一组进程分配资源（CPU, memory, disk I/O, network, etc.）


### UnionFS

UnionFS 其实是一种为 Linux 操作系统设计的用于把多个文件系统『联合』到同一个挂载点的文件系统服务。而 AUFS 即 Advanced UnionFS 其实就是 UnionFS 的升级版，它能够提供更优秀的性能和效率。

## Docker 基本命令

### docker version

``` shell
$ docker version
Client: Docker Engine - Community
 Version:           18.09.2
 API version:       1.39
 Go version:        go1.10.8
 Git commit:        6247962
 Built:             Sun Feb 10 04:12:39 2019
 OS/Arch:           darwin/amd64
 Experimental:      false

Server: Docker Engine - Community
 Engine:
  Version:          18.09.2
  API version:      1.39 (minimum version 1.12)
  Go version:       go1.10.6
  Git commit:       6247962
  Built:            Sun Feb 10 04:13:06 2019
  OS/Arch:          linux/amd64
  Experimental:     false

```

### docker info

``` shell
$ docker info
Containers: 0
 Running: 0
 Paused: 0
 Stopped: 0
Images: 0
Server Version: 18.09.2
Storage Driver: overlay2
 Backing Filesystem: extfs
 Supports d_type: true
 Native Overlay Diff: true
Logging Driver: json-file
Cgroup Driver: cgroupfs
Plugins:
 Volume: local
 Network: bridge host macvlan null overlay
 Log: awslogs fluentd gcplogs gelf journald json-file local logentries splunk syslog
Swarm: inactive
Runtimes: runc
Default Runtime: runc
Init Binary: docker-init
containerd version: 9754871865f7fe2f4e74d43e2fc7ccd237edcbce
runc version: 09c8266bf2fcf9519a651b04ae54c967b9ab86ec
init version: fec3683
Security Options:
 seccomp
  Profile: default
Kernel Version: 4.9.125-linuxkit
Operating System: Docker for Mac
OSType: linux
Architecture: x86_64
CPUs: 4
Total Memory: 1.952GiB
Name: linuxkit-025000000001
ID: TCUF:2IMR:QS25:QSA3:XWGV:NL6K:B5OF:B6PQ:6I2L:LJQY:XYOS:BC4F
Docker Root Dir: /var/lib/docker
Debug Mode (client): false
Debug Mode (server): true
 File Descriptors: 24
 Goroutines: 50
 System Time: 2019-04-10T02:47:02.917656675Z
 EventsListeners: 2
HTTP Proxy: gateway.docker.internal:3128
HTTPS Proxy: gateway.docker.internal:3129
Registry: https://index.docker.io/v1/
Labels:
Experimental: false
Insecure Registries:
 127.0.0.0/8
Live Restore Enabled: false
Product License: Community Engine
```

### docker search

搜索镜像

``` shell
$ docker search ubuntu12.10
NAME                        DESCRIPTION                                     STARS               OFFICIAL            AUTOMATED
chug/ubuntu12.10x64         Ubuntu Quantal Quetzal 12.10 64bit  base ima…   0                                       
chug/ubuntu12.10x32         Ubuntu Quantal Quetzal 12.10 32bit  base ima…   0                                       
yuanzai/ubuntu12.10x64                                                      0                                       
mirolin/ubuntu12.10_redis                                                   0                                       
mirolin/ubuntu12.10                                                         0                                       
marcgibbons/ubuntu12.10                                                     0                                       
khovi/ubuntu12.10                                                           0                                    
```

### docker pull

下载镜像

``` shell
$ docker pull ubuntu
Using default tag: latest
latest: Pulling from library/ubuntu
898c46f3b1a1: Pull complete 
63366dfa0a50: Pull complete 
041d4cd74a92: Pull complete 
6e1bee0f8701: Pull complete 
Digest: sha256:017eef0b616011647b269b5c65826e2e2ebddbe5d1f8c1e56b3599fb14fabec8
Status: Downloaded newer image for ubuntu:latest
```

### docker images

``` shell
$ docker pull ubuntu
Using default tag: latest
latest: Pulling from library/ubuntu
898c46f3b1a1: Pull complete 
63366dfa0a50: Pull complete 
041d4cd74a92: Pull complete 
6e1bee0f8701: Pull complete 
Digest: sha256:017eef0b616011647b269b5c65826e2e2ebddbe5d1f8c1e56b3599fb14fabec8
Status: Downloaded newer image for ubuntu:latest
```

### docker run

#### run 使用镜像创建容器

``` shell
$ docker run ubuntu /bin/echo hello world
hello world
```

#### run 创建容器，并交互式的运行

 -t 选项让Docker分配一个伪终端（pseudo-tty）并绑定到容器的标准输入上， -i 则让容器的标准输入保持打开
 
``` shell
$ docker run -i -t ubuntu /bin/bash
root@5df6791cfcf7:/# 
root@5df6791cfcf7:/# ls
bin   dev  home  lib64  mnt  proc  run   srv  tmp  var
boot  etc  lib   media  opt  root  sbin  sys  usr
```

#### run -d 守护态运行

``` shell
# zhouxinghang @ zhouxinghangdeMacBook-Pro in ~/Documents/myworkspace [11:31:36] 
$ docker run -d ubuntu /bin/bash -c "while true;do echo hello world;sleep 1;done"
95d8965f07977d237471a23fe128edf111f5c54cda85c9e3f4877c06dd60b12e
```

docker logs 容器id 查看容器运行

``` shell
# zhouxinghang @ zhouxinghangdeMacBook-Pro in ~/Documents/myworkspace [11:34:40] 
$ docker logs 95d8965f07977d237471a23fe128edf111f5c54cda85c9e3f4877c06dd60b12e
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
hello world
```

#### docker run 创建容器，执行步骤

- 检查本地是否存在指定镜像，若不存在就去仓库下载
- 利用镜像创建容器
- 分配文件系统，并在只读的镜像层外挂载一层读写层
- 从宿主主机配置的网桥接口中桥接一个虚拟接口到容器中去
- 从地址池配置一个 ip 地址给容器
- 执行用户指定的应用程序
- 执行完成，终止容器

### docker ps 查看容器

-a 包括退出的历史容器

``` shell
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                            PORTS               NAMES
95d8965f0797        ubuntu              "/bin/bash -c 'while…"   6 minutes ago       Exited (137) 10 seconds ago                           elegant_montalcini
5cd7025b91b9        ubuntu              "/bin/bash"              12 minutes ago      Exited (130) About a minute ago                       stoic_yonath
5df6791cfcf7        ubuntu              "/bin/bash"              40 minutes ago      Exited (127) 15 minutes ago                           nifty_kirch
c48f8cdf8076        ubuntu              "/bin/echo hello wor…"   41 minutes ago      Exited (0) 41 minutes ago                             elastic_robinson
```

### docker attach 容器id 连接容器

当多个窗口同时 attach 到同一个容器的时候，所有窗口都会**同步显示**。当某个窗口因命令阻塞时,其他窗口也无法执行操作了。

``` shell
$ docker attach 5cd7025b91b9
root@5cd7025b91b9:/var/log# 
```

### 其它命令

- commit 将容器的状态保存为镜像
- diff 查看容器内容变化
- cp 拷贝文件
- inspect 收集容器和镜像的底层信息
- kill 停止容器主进程




## 参考

https://en.wikipedia.org/wiki/Linux_namespaces

https://en.wikipedia.org/wiki/Cgroups

https://en.wikipedia.org/wiki/Aufs

http://dockone.io/article/2941

https://www.jianshu.com/p/4ab37ad30bd2



