FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build

ARG TARGETARCH
ARG BUILDARCH
ARG ZIG_VERSION=0.16.0
ARG SCRIPTC_VERSION=0.3.5

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
    && rm -rf /var/lib/apt/lists/* \
    && case "$BUILDARCH" in amd64) arch=x86_64 ;; arm64) arch=aarch64 ;; *) exit 1 ;; esac \
    && curl -fsSL "https://ziglang.org/download/${ZIG_VERSION}/zig-${arch}-linux-${ZIG_VERSION}.tar.xz" -o /tmp/zig.tar.xz \
    && tar -xJf /tmp/zig.tar.xz -C /opt \
    && rm /tmp/zig.tar.xz \
    && ln -s "/opt/zig-${arch}-linux-${ZIG_VERSION}/zig" /usr/local/bin/zig

WORKDIR /build
RUN case "$TARGETARCH" in amd64) arch=x64 ;; arm64) arch=arm64 ;; *) exit 1 ;; esac \
    && npm install --no-audit --no-fund "scriptc@${SCRIPTC_VERSION}" "@scriptc/runtime-linux-${arch}-musl@${SCRIPTC_VERSION}"

COPY index.js .
COPY src ./src
RUN case "$TARGETARCH" in amd64) arch=x86_64; pack=x64 ;; arm64) arch=aarch64; pack=arm64 ;; *) exit 1 ;; esac \
    && SCRIPTC_TARGET="${arch}-linux-musl" \
       SCRIPTC_RUNTIME_PACK="/build/node_modules/@scriptc/runtime-linux-${pack}-musl" \
       ./node_modules/.bin/scriptc build index.js -o /ip-api --strip

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=build /ip-api /ip-api
EXPOSE 3000
ENTRYPOINT ["/ip-api"]
