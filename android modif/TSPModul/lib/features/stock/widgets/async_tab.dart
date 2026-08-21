import 'package:flutter/material.dart';

/// Wrapper generik: load data async, tampilkan loading/error+retry, dan
/// dukung pull-to-refresh. Dipakai tiap tab di layar Stock supaya tidak
/// menduplikasi boilerplate FutureBuilder+RefreshIndicator+error state.
class AsyncTab<T> extends StatefulWidget {
  final Future<T> Function() loader;
  final Widget Function(BuildContext context, T data) builder;

  const AsyncTab({super.key, required this.loader, required this.builder});

  @override
  State<AsyncTab<T>> createState() => _AsyncTabState<T>();
}

class _AsyncTabState<T> extends State<AsyncTab<T>> with AutomaticKeepAliveClientMixin {
  late Future<T> _future;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _future = widget.loader();
  }

  Future<void> _refresh() async {
    final next = widget.loader();
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return FutureBuilder<T>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Icon(Icons.error_outline, size: 40, color: Colors.red),
                      const SizedBox(height: 12),
                      Text('Gagal memuat data: ${snapshot.error}', textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _refresh, child: const Text('Coba Lagi')),
                    ],
                  ),
                ),
              ],
            ),
          );
        }
        return RefreshIndicator(onRefresh: _refresh, child: widget.builder(context, snapshot.data as T));
      },
    );
  }
}
