import 'package:dio/dio.dart';

void main() async {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec',
    contentType: 'application/json',
    connectTimeout: const Duration(seconds: 20),
    sendTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 30),
    followRedirects: false,
    validateStatus: (status) => status != null && status < 500,
  ));

  try {
    print('POSTing...');
    var response = await dio.post<dynamic>('', data: {'action': 'login', 'nik': '123', 'password': '123'});
    print('POST status: \');
    
    if (response.statusCode == 302) {
      final location = response.headers.value('location');
      print('Redirect to: \');
      print('GETing...');
      response = await dio.get<dynamic>(location!);
      print('GET status: \');
      print('GET data: \');
    }
  } on DioException catch (e) {
    print('DioError: \ - \');
  } catch (e) {
    print('Error: \');
  }
}
