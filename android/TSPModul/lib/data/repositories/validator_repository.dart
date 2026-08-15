import '../../core/api_client.dart';
import '../models/validator_models.dart';

class ValidatorRepository {
  final ApiClient _api;
  ValidatorRepository(this._api);

  Future<ValidatorData> getValidatorData() async {
    final res = await _api.call('getValidatorData');
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat data validator.');
    }
    return ValidatorData.fromJson(res['data'] as Map<String, dynamic>);
  }
}
