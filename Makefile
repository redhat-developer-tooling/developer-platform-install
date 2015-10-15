DOCKER_WINDOWS_IMAGE := windows-installer
DOCKER_WINDOWS_CONTAINER := build-windows

default: windows
	@true

windows: clean-windows
	docker build -t $(DOCKER_WINDOWS_IMAGE) -f Dockerfile.windows .
	docker run --name "$(DOCKER_WINDOWS_CONTAINER)" "$(DOCKER_WINDOWS_IMAGE)"
	mkdir -p dist
	docker cp "$(DOCKER_WINDOWS_CONTAINER)":/installer/Output/developer_platform.exe dist/
	docker rm "$(DOCKER_WINDOWS_CONTAINER)" 2>/dev/null || true

clean-windows:
	rm -f developer_platform.exe
	docker rm "$(DOCKER_WINDOWS_CONTAINER)" 2>/dev/null || true
